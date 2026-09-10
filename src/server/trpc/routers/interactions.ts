import { contact, interaction } from "@/db/schema";
import { indexContacts, reindexQuietly } from "@/server/search";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { logActivity } from "../activity";
import { createTRPCRouter, protectedProcedure } from "../init";

const optionalText = z
	.string()
	.trim()
	.max(200)
	.nullish()
	.transform((v) => v || null);

/**
 * The interaction log: what we did with somebody, when. See the table's
 * note in `schema.ts`. Every change re-embeds the contact, because the
 * log is part of what makes "who did we ask about a venue" findable.
 */
export const interactionsRouter = createTRPCRouter({
	byContact: protectedProcedure
		.input(z.object({ contactId: z.uuid() }))
		.query(async ({ ctx, input }) => {
			return ctx.db
				.select()
				.from(interaction)
				.where(eq(interaction.contactId, input.contactId))
				.orderBy(desc(interaction.occurredAt), desc(interaction.createdAt));
		}),

	create: protectedProcedure
		.input(
			z.object({
				contactId: z.uuid(),
				summary: z.string().trim().min(1).max(4000),
				topic: optionalText,
				occurredAt: z.coerce.date().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [person] = await ctx.db
				.select({ id: contact.id })
				.from(contact)
				.where(and(eq(contact.id, input.contactId), isNull(contact.deletedAt)))
				.limit(1);
			if (!person) {
				throw new TRPCError({ code: "NOT_FOUND", message: "No such contact." });
			}

			const [row] = await ctx.db
				.insert(interaction)
				.values({
					contactId: input.contactId,
					summary: input.summary,
					topic: input.topic,
					occurredAt: input.occurredAt ?? new Date(),
					createdBy: ctx.user.id,
				})
				.returning();

			await logActivity({
				actorUserId: ctx.user.id,
				entityType: "contact",
				entityId: input.contactId,
				verb: "logged",
				field: input.topic,
				newValue: input.summary,
			});

			await reindexQuietly(() => indexContacts({ ids: [input.contactId] }));

			return row;
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.uuid(),
				summary: z.string().trim().min(1).max(4000).optional(),
				topic: optionalText.optional(),
				occurredAt: z.coerce.date().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { id, ...patch } = input;
			const [row] = await ctx.db
				.update(interaction)
				.set({ ...patch, updatedAt: new Date() })
				.where(eq(interaction.id, id))
				.returning();
			if (!row) {
				throw new TRPCError({ code: "NOT_FOUND", message: "No such entry." });
			}
			await reindexQuietly(() => indexContacts({ ids: [row.contactId] }));
			return row;
		}),

	remove: protectedProcedure
		.input(z.object({ id: z.uuid() }))
		.mutation(async ({ ctx, input }) => {
			const [row] = await ctx.db
				.delete(interaction)
				.where(eq(interaction.id, input.id))
				.returning({
					contactId: interaction.contactId,
					summary: interaction.summary,
				});
			if (!row) return { deleted: false };

			await logActivity({
				actorUserId: ctx.user.id,
				entityType: "contact",
				entityId: row.contactId,
				verb: "removed a log entry",
				oldValue: row.summary,
			});
			await reindexQuietly(() => indexContacts({ ids: [row.contactId] }));
			return { deleted: true };
		}),
});
