import { aiConversation } from "@/db/schema";
import { MAX_OPERATIONS, operationSchema } from "@/lib/ai-operations";
import { applyOperations } from "@/server/ai/apply";
import { makeCaller } from "@/server/ai/caller";
import { MODEL } from "@/server/ai/chat";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";

/**
 * The assistant's write path, and its memory. The conversation itself
 * streams through `/api/ai/chat`; `applyProposal` is the one call that
 * changes the list, and it is made by a person pressing Apply on a card,
 * never by the model. The rest keeps conversations so they can be reopened.
 */

/**
 * The browser's own picture of a conversation, checked for shape and size
 * and otherwise stored as given: it is read back by the same code that
 * wrote it, and nothing on the server interprets it.
 */
const conversationState = z.object({
	transcript: z
		.array(
			z.object({
				role: z.enum(["user", "assistant", "system"]),
				content: z.unknown(),
			}),
		)
		.max(400),
	outcomes: z.record(z.string(), z.unknown()),
	proposals: z.record(z.string(), z.unknown()),
	pending: z.unknown().nullable(),
});

/** Past this a conversation is a paste gone wrong, not a conversation. */
const MAX_STATE_BYTES = 4_000_000;

export const aiRouter = createTRPCRouter({
	status: protectedProcedure.query(() => ({
		configured: Boolean(process.env.ANTHROPIC_API_KEY),
		model: MODEL,
	})),

	/**
	 * Re-validated here from scratch rather than trusted from the card: the
	 * operations come back from the browser, and the browser is not the
	 * boundary. Each then runs through its ordinary procedure.
	 */
	applyProposal: protectedProcedure
		.input(
			z.object({
				operations: z.array(operationSchema).min(1).max(MAX_OPERATIONS),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const caller = await makeCaller(ctx);
			return applyOperations(input.operations, { ctx, caller });
		}),

	/** Your conversations, most recently touched first. Titles only. */
	conversations: protectedProcedure.query(async ({ ctx }) => {
		return ctx.db
			.select({
				id: aiConversation.id,
				title: aiConversation.title,
				createdAt: aiConversation.createdAt,
				updatedAt: aiConversation.updatedAt,
				// How long it ran, without shipping the transcript to list it.
				messages: sql<number>`jsonb_array_length(${aiConversation.state} -> 'transcript')`,
			})
			.from(aiConversation)
			.where(eq(aiConversation.userId, ctx.user.id))
			.orderBy(desc(aiConversation.updatedAt))
			.limit(100);
	}),

	conversation: protectedProcedure
		.input(z.object({ id: z.uuid() }))
		.query(async ({ ctx, input }) => {
			const [row] = await ctx.db
				.select()
				.from(aiConversation)
				.where(
					and(
						eq(aiConversation.id, input.id),
						eq(aiConversation.userId, ctx.user.id),
					),
				)
				.limit(1);
			if (!row) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "No such conversation.",
				});
			}
			return row;
		}),

	/** Upsert. Without an id it starts a conversation and returns the id. */
	saveConversation: protectedProcedure
		.input(
			z.object({
				id: z.uuid().optional(),
				title: z.string().trim().min(1).max(120),
				state: conversationState,
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (JSON.stringify(input.state).length > MAX_STATE_BYTES) {
				throw new TRPCError({
					code: "PAYLOAD_TOO_LARGE",
					message: "This conversation is too long to keep. Start a new one.",
				});
			}

			if (input.id) {
				const [row] = await ctx.db
					.update(aiConversation)
					.set({
						title: input.title,
						state: input.state,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(aiConversation.id, input.id),
							eq(aiConversation.userId, ctx.user.id),
						),
					)
					.returning({ id: aiConversation.id });
				if (row) return row;
				// Deleted from another tab, or never ours: fall through and
				// start it again rather than losing what was typed.
			}

			const [row] = await ctx.db
				.insert(aiConversation)
				.values({
					userId: ctx.user.id,
					title: input.title,
					state: input.state,
				})
				.returning({ id: aiConversation.id });
			return row;
		}),

	removeConversation: protectedProcedure
		.input(z.object({ id: z.uuid() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.db
				.delete(aiConversation)
				.where(
					and(
						eq(aiConversation.id, input.id),
						eq(aiConversation.userId, ctx.user.id),
					),
				);
			return { deleted: true };
		}),
});
