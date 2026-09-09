import { contact, link, linkEvent, update } from "@/db/schema";
import { isAutomatedClick } from "@/lib/bots";
import { getPost, listPosts } from "@/lib/posts";
import { indexUpdates, reindexQuietly } from "@/server/search";
import { TRPCError } from "@trpc/server";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { logActivity } from "../activity";
import { createTRPCRouter, protectedProcedure } from "../init";

export const updatesRouter = createTRPCRouter({
	/**
	 * Every markdown file in `content/blog`, with the ones already sent marked.
	 * The text stays in git; this is the picker for turning one into an update.
	 */
	availablePosts: protectedProcedure.query(async ({ ctx }) => {
		const used = new Set(
			(await ctx.db.select({ slug: update.slug }).from(update)).map(
				(r) => r.slug,
			),
		);

		return listPosts().map((post) => ({
			slug: post.slug,
			name: post.name,
			description: post.description,
			visibility: post.visibility,
			date: post.date,
			used: used.has(post.slug),
		}));
	}),

	list: protectedProcedure.query(async ({ ctx }) => {
		const rows = await ctx.db
			.select({
				id: update.id,
				slug: update.slug,
				title: update.title,
				createdAt: update.createdAt,
				ref: link.ref,
				linkRevokedAt: link.revokedAt,
				eventId: linkEvent.id,
				eventAgent: linkEvent.userAgent,
			})
			.from(update)
			.leftJoin(link, eq(link.updateId, update.id))
			.leftJoin(linkEvent, eq(linkEvent.ref, link.ref))
			.orderBy(desc(update.createdAt));

		// Folded here rather than in SQL: "opened" means "at least one hit that
		// was not a scanner", and which hits those are is a judgement that lives
		// in one predicate, not in a query.
		const byUpdate = new Map<
			string,
			{
				id: string;
				slug: string;
				title: string;
				createdAt: Date;
				recipients: Set<string>;
				opened: Set<string>;
			}
		>();

		for (const row of rows) {
			let entry = byUpdate.get(row.id);
			if (!entry) {
				entry = {
					id: row.id,
					slug: row.slug,
					title: row.title,
					createdAt: row.createdAt,
					recipients: new Set(),
					opened: new Set(),
				};
				byUpdate.set(row.id, entry);
			}
			if (row.ref) entry.recipients.add(row.ref);
			if (
				row.ref &&
				row.eventId !== null &&
				!isAutomatedClick(row.eventAgent)
			) {
				entry.opened.add(row.ref);
			}
		}

		return [...byUpdate.values()].map((entry) => ({
			id: entry.id,
			slug: entry.slug,
			title: entry.title,
			createdAt: entry.createdAt,
			recipients: entry.recipients.size,
			opened: entry.opened.size,
		}));
	}),

	byId: protectedProcedure
		.input(z.object({ id: z.uuid() }))
		.query(async ({ ctx, input }) => {
			const [row] = await ctx.db
				.select()
				.from(update)
				.where(eq(update.id, input.id))
				.limit(1);

			if (!row) {
				throw new TRPCError({ code: "NOT_FOUND", message: "No such update." });
			}

			const links = await ctx.db
				.select({
					id: link.id,
					ref: link.ref,
					revokedAt: link.revokedAt,
					createdAt: link.createdAt,
					contactId: contact.id,
					contactName: contact.name,
					contactEmail: contact.email,
				})
				.from(link)
				.innerJoin(contact, eq(contact.id, link.contactId))
				.where(eq(link.updateId, input.id))
				.orderBy(asc(contact.email));

			const events = await ctx.db
				.select({
					ref: linkEvent.ref,
					at: linkEvent.createdAt,
					userAgent: linkEvent.userAgent,
				})
				.from(linkEvent)
				.innerJoin(link, eq(link.ref, linkEvent.ref))
				.where(eq(link.updateId, input.id))
				.orderBy(asc(linkEvent.createdAt));

			const stats = new Map<string, { clicks: number; firstAt: Date | null }>();
			for (const event of events) {
				if (isAutomatedClick(event.userAgent)) continue;
				const current = stats.get(event.ref) ?? { clicks: 0, firstAt: null };
				current.clicks += 1;
				current.firstAt ??= event.at;
				stats.set(event.ref, current);
			}

			return {
				update: row,
				recipients: links.map((entry) => ({
					...entry,
					clicks: stats.get(entry.ref)?.clicks ?? 0,
					firstClickAt: stats.get(entry.ref)?.firstAt ?? null,
				})),
			};
		}),

	create: protectedProcedure
		.input(z.object({ slug: z.string().trim().min(1) }))
		.mutation(async ({ ctx, input }) => {
			const post = getPost(input.slug);
			if (!post) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `No post named "${input.slug}" in content/blog.`,
				});
			}

			const [existing] = await ctx.db
				.select()
				.from(update)
				.where(eq(update.slug, input.slug))
				.limit(1);
			if (existing) return existing;

			// The title is snapshotted rather than read back from the file, so
			// renaming the markdown later cannot rewrite what you sent.
			const [row] = await ctx.db
				.insert(update)
				.values({ slug: post.slug, title: post.name, createdBy: ctx.user.id })
				.returning();

			await logActivity({
				actorUserId: ctx.user.id,
				entityType: "update",
				entityId: row.id,
				verb: "created",
				newValue: row.slug,
			});

			await reindexQuietly(() => indexUpdates({ ids: [row.id] }));

			return row;
		}),

	remove: protectedProcedure
		.input(z.object({ id: z.uuid() }))
		.mutation(async ({ ctx, input }) => {
			const [live] = await ctx.db
				.select({ ref: link.ref })
				.from(link)
				.where(eq(link.updateId, input.id))
				.limit(1);

			if (live) {
				throw new TRPCError({
					code: "CONFLICT",
					message:
						"This update has links out. Revoke them first, or leave it: an update with history is not a draft.",
				});
			}

			await ctx.db.delete(update).where(eq(update.id, input.id));

			await logActivity({
				actorUserId: ctx.user.id,
				entityType: "update",
				entityId: input.id,
				verb: "deleted",
			});

			return { deleted: true };
		}),
});
