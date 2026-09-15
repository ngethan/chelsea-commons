import { integration } from "@/db/schema";
import {
	INTEGRATIONS,
	PROVIDERS,
	type Provider,
	isProvider,
	missingScopes,
	revoke,
	scopeLabel,
} from "@/server/integrations/google";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";

const provider = z.custom<Provider>(isProvider, "Unknown integration.");

/**
 * The signed-in person's own grants. Connecting is not here: it is a
 * redirect through Google, served by `/api/integrations/<provider>/start`
 * and `.../callback`. This router is what the page reads and the one thing
 * it can do without leaving: disconnect.
 */
export const integrationsRouter = createTRPCRouter({
	/** One entry per integration, connected or not, in a fixed order. */
	list: protectedProcedure.query(async ({ ctx }) => {
		const rows = await ctx.db
			.select({
				provider: integration.provider,
				email: integration.email,
				scopes: integration.scopes,
				connectedAt: integration.connectedAt,
			})
			.from(integration)
			.where(eq(integration.userId, ctx.user.id));

		return PROVIDERS.map((key) => {
			const row = rows.find((r) => r.provider === key);
			return {
				provider: key,
				label: INTEGRATIONS[key].label,
				email: row?.email ?? null,
				connectedAt: row?.connectedAt ?? null,
				scopes: (row?.scopes ?? []).map((s) => ({
					scope: s,
					label: scopeLabel(s),
				})),
				/** True when the grant lacks a scope the integration needs now. */
				stale: row ? missingScopes(key, row.scopes).length > 0 : false,
			};
		});
	}),

	/**
	 * Revokes the grant at Google and forgets it here. Revocation failing
	 * (Google down, token long dead) still removes the row: what the person
	 * asked for is that this app stop reading, and the row is what lets it.
	 */
	disconnect: protectedProcedure
		.input(z.object({ provider }))
		.mutation(async ({ ctx, input }) => {
			const [row] = await ctx.db
				.select({ id: integration.id, refreshToken: integration.refreshToken })
				.from(integration)
				.where(
					and(
						eq(integration.userId, ctx.user.id),
						eq(integration.provider, input.provider),
					),
				)
				.limit(1);
			if (!row) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Not connected." });
			}

			await revoke(row.refreshToken).catch((error: unknown) => {
				console.error(`Could not revoke ${input.provider} at Google:`, error);
			});
			await ctx.db.delete(integration).where(eq(integration.id, row.id));
			return { ok: true };
		}),
});
