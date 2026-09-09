import { contact, link, linkEvent, update } from "@/db/schema";
import { isAutomatedClick } from "@/lib/bots";
import { newRef } from "@/lib/tracking";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { logActivity } from "../activity";
import { createTRPCRouter, protectedProcedure } from "../init";

export const linksRouter = createTRPCRouter({
	/**
	 * One link per person per update, minted for everybody named who does not
	 * have one yet.
	 *
	 * Idempotent by construction: `one_link_per_contact_per_update` means a
	 * second call for the same pair returns the ref that already exists rather
	 * than a new one. Two refs for one reader would split their history in
	 * half, and both halves look like ordinary numbers, so nothing would ever
	 * tell you it had happened.
	 */
	createForContacts: protectedProcedure
		.input(
			z.object({
				updateId: z.uuid(),
				contactIds: z.array(z.uuid()).min(1, "Pick at least one person."),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [target] = await ctx.db
				.select()
				.from(update)
				.where(eq(update.id, input.updateId))
				.limit(1);

			if (!target) {
				throw new TRPCError({ code: "NOT_FOUND", message: "No such update." });
			}

			const live = await ctx.db
				.select({ id: contact.id })
				.from(contact)
				.where(
					and(inArray(contact.id, input.contactIds), isNull(contact.deletedAt)),
				);

			const existing = await ctx.db
				.select({ contactId: link.contactId })
				.from(link)
				.where(
					and(
						eq(link.updateId, input.updateId),
						inArray(link.contactId, input.contactIds),
					),
				);

			const already = new Set(existing.map((row) => row.contactId));
			const fresh = live.filter((row) => !already.has(row.id));

			if (fresh.length > 0) {
				await ctx.db.insert(link).values(
					fresh.map((row) => ({
						ref: newRef(),
						contactId: row.id,
						updateId: input.updateId,
						createdBy: ctx.user.id,
					})),
				);

				await logActivity(
					fresh.map((row) => ({
						actorUserId: ctx.user.id,
						entityType: "contact" as const,
						entityId: row.id,
						verb: "linked",
						newValue: target.title,
					})),
				);
			}

			return { created: fresh.length, existing: already.size };
		}),

	/** Every link for one person, for the contact drawer. */
	byContact: protectedProcedure
		.input(z.object({ contactId: z.uuid() }))
		.query(async ({ ctx, input }) => {
			const rows = await ctx.db
				.select({
					id: link.id,
					ref: link.ref,
					revokedAt: link.revokedAt,
					createdAt: link.createdAt,
					updateId: update.id,
					updateTitle: update.title,
				})
				.from(link)
				.innerJoin(update, eq(update.id, link.updateId))
				.where(eq(link.contactId, input.contactId))
				.orderBy(desc(link.createdAt));

			if (rows.length === 0) return [];

			const events = await ctx.db
				.select({ ref: linkEvent.ref, userAgent: linkEvent.userAgent })
				.from(linkEvent)
				.where(
					inArray(
						linkEvent.ref,
						rows.map((row) => row.ref),
					),
				);

			const clicks = new Map<string, number>();
			for (const event of events) {
				if (isAutomatedClick(event.userAgent)) continue;
				clicks.set(event.ref, (clicks.get(event.ref) ?? 0) + 1);
			}

			return rows.map((row) => ({ ...row, clicks: clicks.get(row.ref) ?? 0 }));
		}),

	/**
	 * Kills one link. `/u/<ref>` then answers 404, exactly as it does for a ref
	 * that never existed, so a revoked link cannot be told apart from a
	 * mistyped one by whoever is still holding it.
	 */
	revoke: protectedProcedure
		.input(z.object({ id: z.uuid() }))
		.mutation(async ({ ctx, input }) => {
			const [row] = await ctx.db
				.update(link)
				.set({ revokedAt: new Date() })
				.where(and(eq(link.id, input.id), isNull(link.revokedAt)))
				.returning({ contactId: link.contactId, ref: link.ref });

			if (!row) return { revoked: false };

			await logActivity({
				actorUserId: ctx.user.id,
				entityType: "contact",
				entityId: row.contactId,
				verb: "revoked a link",
				oldValue: row.ref,
			});

			return { revoked: true };
		}),
});
