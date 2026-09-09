import { createTRPCContext } from "@/server/trpc/init";
import { appRouter } from "@/server/trpc/root";
import { createFileRoute } from "@tanstack/react-router";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

function handler({ request }: { request: Request }) {
	return fetchRequestHandler({
		endpoint: "/api/trpc",
		req: request,
		router: appRouter,
		createContext: () => createTRPCContext({ headers: request.headers }),
		responseMeta() {
			// Everything behind here is one person's private list. A shared cache
			// holding any of it is a bug waiting for a second reader.
			return {
				headers: {
					"cache-control": "no-store",
					"x-content-type-options": "nosniff",
				},
			};
		},
	});
}

export const Route = createFileRoute("/api/trpc/$")({
	server: { handlers: { GET: handler, POST: handler } },
});
