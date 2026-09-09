import { type ChatEvent, encodeEvent } from "@/lib/ai-protocol";
import { makeCaller } from "@/server/ai/caller";
import { runChat } from "@/server/ai/chat";
import { createTRPCContext } from "@/server/trpc/init";
import Anthropic from "@anthropic-ai/sdk";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * The assistant's one endpoint. Not tRPC because tRPC does not stream, and a
 * turn that takes twenty seconds with nothing on screen is a broken page.
 *
 * Same boundary as everything else behind /admin: the Better Auth session,
 * resolved by `createTRPCContext`, and a 401 without one. Every tool the
 * model calls then goes through `protectedProcedure` with that context.
 */

/** The transcript, loosely. The API validates the shape properly; this stops junk. */
const bodySchema = z.object({
	messages: z
		.array(
			z.object({
				role: z.enum(["user", "assistant"]),
				content: z.union([
					z.string(),
					z.array(z.record(z.string(), z.unknown())),
				]),
			}),
		)
		.min(1)
		.max(400),
});

/** A transcript larger than this is not a conversation, it is a paste gone wrong. */
const MAX_BODY_BYTES = 4_000_000;

function friendly(err: unknown): string {
	if (err instanceof Anthropic.AuthenticationError)
		return "The ANTHROPIC_API_KEY is not accepted.";
	if (err instanceof Anthropic.RateLimitError)
		return "Rate limited by the model. Try again in a moment.";
	if (err instanceof Anthropic.BadRequestError)
		return `The model rejected the request: ${err.message}`;
	if (err instanceof Anthropic.APIConnectionError)
		return "Could not reach the model.";
	if (err instanceof Anthropic.APIError)
		return `Model error ${err.status ?? ""}: ${err.message}`;
	return "Something went wrong.";
}

async function POST({ request }: { request: Request }) {
	const ctx = await createTRPCContext({ headers: request.headers });
	if (!ctx.user) return new Response("Unauthorized", { status: 401 });

	if (!process.env.ANTHROPIC_API_KEY) {
		return Response.json(
			{ error: "ANTHROPIC_API_KEY is not set, so the assistant is off." },
			{ status: 503 },
		);
	}

	const raw = await request.text();
	if (raw.length > MAX_BODY_BYTES) {
		return Response.json(
			{ error: "That conversation is too large." },
			{ status: 413 },
		);
	}
	let body: z.infer<typeof bodySchema>;
	try {
		body = bodySchema.parse(JSON.parse(raw));
	} catch {
		return Response.json({ error: "Bad request." }, { status: 400 });
	}
	if (body.messages[0]?.role !== "user") {
		return Response.json({ error: "Bad request." }, { status: 400 });
	}

	const signedIn = { ...ctx, user: ctx.user };
	const tc = { ctx: signedIn, caller: await makeCaller(signedIn) };

	const abort = new AbortController();
	request.signal.addEventListener("abort", () => abort.abort());

	const encoder = new TextEncoder();
	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			const send = (event: ChatEvent) =>
				controller.enqueue(encoder.encode(encodeEvent(event)));
			try {
				for await (const event of runChat({
					messages: body.messages as never,
					tc,
					signal: abort.signal,
				})) {
					send(event);
				}
			} catch (err) {
				if (
					abort.signal.aborted ||
					err instanceof Anthropic.APIUserAbortError
				) {
					send({ type: "done", reason: "aborted", pendingResults: [] });
				} else {
					console.error("[ai] turn failed", err);
					send({ type: "error", message: friendly(err) });
				}
			} finally {
				try {
					controller.close();
				} catch {
					// Already closed by a cancel.
				}
			}
		},
		cancel() {
			abort.abort();
		},
	});

	return new Response(stream, {
		headers: {
			"content-type": "application/x-ndjson; charset=utf-8",
			"cache-control": "no-store",
			"x-content-type-options": "nosniff",
			"x-accel-buffering": "no",
		},
	});
}

export const Route = createFileRoute("/api/ai/chat")({
	server: { handlers: { POST } },
});
