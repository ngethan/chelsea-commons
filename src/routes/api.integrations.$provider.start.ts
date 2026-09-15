import { authorizationUrl, isProvider } from "@/server/integrations/google";
import { newState, stateCookie } from "@/server/integrations/state";
import { createTRPCContext } from "@/server/trpc/init";
import { createFileRoute } from "@tanstack/react-router";

/**
 * Step one of connecting an integration: send the signed-in person to
 * Google's consent screen for that integration's scopes. The grant that
 * comes back lands in `../callback`.
 */
export const Route = createFileRoute("/api/integrations/$provider/start")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				const ctx = await createTRPCContext({ headers: request.headers });
				if (!ctx.user || !ctx.role) {
					return new Response("Unauthorized", { status: 401 });
				}
				if (!isProvider(params.provider)) {
					return new Response("Not found", { status: 404 });
				}

				const state = newState();
				const url = authorizationUrl({ provider: params.provider, state });
				return new Response(null, {
					status: 302,
					headers: {
						location: url,
						"set-cookie": stateCookie(state, request.url.startsWith("https")),
					},
				});
			},
		},
	},
});
