import { isAdmin } from "@/lib/roles";
import { createTRPCContext } from "@/server/trpc/init";
import { createFileRoute } from "@tanstack/react-router";
import { type HandleUploadBody, handleUpload } from "@vercel/blob/client";

/**
 * Issues the token a photo is uploaded with. The bytes never come here.
 *
 * A serverless function's request body is capped at 4.5MB, which is smaller
 * than a photo off a phone, so a route that took the file itself could not
 * accept the thing it exists for. The browser uploads straight to Blob
 * instead, and this says whether it may and on what terms.
 *
 * Two callers, and only one of them is a person. `onBeforeGenerateToken` runs
 * for the browser asking permission, and that is where the session is checked.
 * `onUploadCompleted` is Vercel calling back afterwards, server to server,
 * carrying no cookie: a check at the top of this handler would refuse it. The
 * callback is signed and `handleUpload` verifies it.
 */
const MAX_BYTES = 25_000_000;

const TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/avif",
	"image/gif",
];

async function POST({ request }: { request: Request }) {
	if (!process.env.BLOB_READ_WRITE_TOKEN) {
		return Response.json(
			{ error: "BLOB_READ_WRITE_TOKEN is not set, so uploads are off." },
			{ status: 503 },
		);
	}

	const body = (await request.json().catch(() => null)) as HandleUploadBody;
	if (!body) return Response.json({ error: "Bad request." }, { status: 400 });

	try {
		const result = await handleUpload({
			body,
			request,
			onBeforeGenerateToken: async () => {
				const ctx = await createTRPCContext({ headers: request.headers });
				if (!ctx.user || !isAdmin(ctx.role)) {
					throw new Error("Not allowed to upload.");
				}
				return {
					allowedContentTypes: TYPES,
					maximumSizeInBytes: MAX_BYTES,
					addRandomSuffix: true,
				};
			},
			onUploadCompleted: async () => {
				// Nothing to record: the URL is written into the post's document
				// by the editor, and a blob nothing references is a blob nothing
				// shows.
			},
		});

		return Response.json(result);
	} catch (err) {
		const message = err instanceof Error ? err.message : "Upload failed.";
		console.error("[upload] failed", err);
		return Response.json({ error: message }, { status: 400 });
	}
}

export const Route = createFileRoute("/api/upload")({
	server: { handlers: { POST } },
});
