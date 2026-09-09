import type { AppRouter } from "@/server/trpc/root";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

/**
 * During SSR the request is made by the server to itself, so the browser's
 * cookie has to be carried across by hand or every server-rendered page
 * believes it is signed out. On the client the browser attaches it.
 */
const forwardHeaders = createIsomorphicFn()
	.client((): Record<string, string> => ({}))
	.server((): Record<string, string> => {
		// Hop-by-hop headers describe the inbound connection, not a request we
		// are making onward, so they are dropped rather than copied.
		const HOP_BY_HOP = new Set([
			"connection",
			"content-length",
			"transfer-encoding",
			"keep-alive",
			"upgrade",
		]);

		const headers: Record<string, string> = {};
		for (const [key, value] of getRequestHeaders() as unknown as Headers) {
			if (!HOP_BY_HOP.has(key.toLowerCase())) {
				headers[key] = value;
			}
		}
		return headers;
	});

const origin = createIsomorphicFn()
	.client(() => window.location.origin)
	.server(
		() =>
			process.env.BETTER_AUTH_URL ??
			(process.env.VERCEL_URL
				? `https://${process.env.VERCEL_URL}`
				: undefined) ??
			"http://localhost:3000",
	);

function links() {
	return [
		httpBatchLink({
			url: `${origin()}/api/trpc`,
			transformer: superjson,
			headers: forwardHeaders,
		}),
	];
}

export function makeTRPCClient() {
	return trpc.createClient({ links: links() });
}

/** A plain caller for code outside React, such as a route's `beforeLoad`. */
export function makeVanillaClient() {
	return createTRPCClient<AppRouter>({ links: links() });
}
