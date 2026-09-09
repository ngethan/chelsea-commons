import { contact, organization } from "@/db/schema";
import { indexAll, indexStatus, search } from "@/server/search";
import { desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";

export const searchRouter = createTRPCRouter({
	/** What cmd-K shows while you type. See `src/server/search`. */
	query: protectedProcedure
		.input(
			z.object({
				q: z.string().max(200),
				limit: z.number().int().min(1).max(30).default(8),
			}),
		)
		.query(({ input }) => search(input.q, input.limit)),

	/**
	 * What cmd-K shows before you type: the people most recently touched, on
	 * the theory that the record you want is usually the one you just had.
	 */
	recent: protectedProcedure.query(async ({ ctx }) => {
		return ctx.db
			.select({
				id: contact.id,
				name: contact.name,
				email: contact.email,
				status: contact.status,
				organizationName: organization.name,
				updatedAt: contact.updatedAt,
			})
			.from(contact)
			.leftJoin(organization, eq(organization.id, contact.organizationId))
			.where(isNull(contact.deletedAt))
			.orderBy(desc(contact.updatedAt))
			.limit(6);
	}),

	status: protectedProcedure.query(() => indexStatus()),

	/**
	 * Embeds every row whose document has changed since it was last embedded,
	 * or every row at all with `force`. Idempotent, so it is safe to press
	 * twice, and it is how a database that predates the index gets one.
	 */
	reindex: protectedProcedure
		.input(z.object({ force: z.boolean().default(false) }))
		.mutation(({ input }) => indexAll(input)),
});
