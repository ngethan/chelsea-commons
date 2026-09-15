import { integration } from "@/db/schema";
import {
	type Provider,
	exchangeCode,
	gmailProfile,
	isProvider,
} from "@/server/integrations/google";
import { clearStateCookie, readState } from "@/server/integrations/state";
import { createTRPCContext } from "@/server/trpc/init";
import { createFileRoute } from "@tanstack/react-router";
import { sql } from "drizzle-orm";

/**
 * Step two: Google sends the browser back here with a code (or a refusal).
 * The code becomes a refresh token, the token is proven against the
 * product once, and the row is written. Every exit is a redirect to the
 * integrations page, which reads `connected` or `error` and toasts it.
 */
const PAGE = "/admin/settings/integrations";

function back(search: Record<string, string>): Response {
	const query = new URLSearchParams(search).toString();
	return new Response(null, {
		status: 302,
		headers: {
			location: `${PAGE}?${query}`,
			"set-cookie": clearStateCookie(),
		},
	});
}

/** The address behind a grant, checked against the product it was granted for. */
async function granteeEmail(provider: Provider, accessToken: string) {
	switch (provider) {
		case "gmail":
			return (await gmailProfile(accessToken)).emailAddress;
	}
}

export const Route = createFileRoute("/api/integrations/$provider/callback")({
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
				const provider = params.provider;
				const url = new URL(request.url);

				if (url.searchParams.get("error")) {
					// `access_denied` is them pressing Cancel; anything else is
					// Google's own code, which the toast shows as-is.
					return back({ error: url.searchParams.get("error") ?? "denied" });
				}

				const code = url.searchParams.get("code");
				const state = url.searchParams.get("state");
				const expected = readState(request);
				if (!code || !state || !expected || state !== expected) {
					return back({ error: "state" });
				}

				try {
					const tokens = await exchangeCode(provider, code);
					const email = await granteeEmail(provider, tokens.accessToken);

					await ctx.db
						.insert(integration)
						.values({
							userId: ctx.user.id,
							provider,
							email,
							scopes: tokens.scopes,
							refreshToken: tokens.refreshToken,
							accessToken: tokens.accessToken,
							accessTokenExpiresAt: tokens.accessTokenExpiresAt,
						})
						.onConflictDoUpdate({
							target: [integration.userId, integration.provider],
							set: {
								email,
								scopes: tokens.scopes,
								refreshToken: tokens.refreshToken,
								accessToken: tokens.accessToken,
								accessTokenExpiresAt: tokens.accessTokenExpiresAt,
								connectedAt: sql`now()`,
								updatedAt: sql`now()`,
							},
						});
				} catch (error) {
					console.error(`Could not connect ${provider}:`, error);
					return back({ error: "exchange" });
				}

				return back({ connected: provider });
			},
		},
	},
});
