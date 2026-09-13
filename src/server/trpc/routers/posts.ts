import { contact, link, linkEvent, post, postRevision } from "@/db/schema";
import { isAutomatedClick } from "@/lib/bots";
import { EMPTY_DOC } from "@/lib/post-doc";
import {
	POST_KINDS,
	type POST_STATUSES,
	POST_VISIBILITIES,
	slugify,
	visibilityFor,
} from "@/lib/post-state";
import { indexPosts, reindexQuietly } from "@/server/search";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { z } from "zod";
import { fieldChanges, logActivity } from "../activity";
import { adminProcedure, createTRPCRouter, protectedProcedure } from "../init";

/**
 * The document is stored as the editor hands it over, so there is nothing here
 * to validate it against beyond its outermost shape: the editor's schema is
 * the real contract and it lives in the browser. Storing a tree the renderer
 * skips over is survivable; refusing to save somebody's letter because a node
 * type is newer than this file is not.
 */
const docInput = z.object({ type: z.literal("doc") }).loose();

const blank = z
	.string()
	.trim()
	.nullish()
	.transform((v) => v || null);

const postInput = z.object({
	name: z.string().trim().min(1, "A title is required."),
	description: blank,
	subtitle: blank,
	dateLabel: blank,
	doc: docInput,
	kind: z.enum(POST_KINDS),
	visibility: z.enum(POST_VISIBILITIES),
});

/** Free while a draft, refused once the URL is somebody's. */
const slugInput = z
	.string()
	.trim()
	.transform(slugify)
	.refine((v) => v.length > 0, "A slug is required.");

async function load(db: Ctx["db"], id: string) {
	const [row] = await db.select().from(post).where(eq(post.id, id)).limit(1);
	if (!row)
		throw new TRPCError({ code: "NOT_FOUND", message: "No such post." });
	return row;
}

type Ctx = Parameters<Parameters<typeof protectedProcedure.query>[0]>[0]["ctx"];

/**
 * A slug nobody else holds. Only ever called for a draft: once a post is
 * published its slug stops moving, so this cannot rename somebody's URL out
 * from under them.
 */
async function freeSlug(db: Ctx["db"], wanted: string, exceptId?: string) {
	for (let n = 0; ; n++) {
		const candidate = n === 0 ? wanted : `${wanted}-${n + 1}`;
		const [taken] = await db
			.select({ id: post.id })
			.from(post)
			.where(
				exceptId
					? and(eq(post.slug, candidate), ne(post.id, exceptId))
					: eq(post.slug, candidate),
			)
			.limit(1);
		if (!taken) return candidate;
	}
}

export const postsRouter = createTRPCRouter({
	/**
	 * Every post, with recipients and opens folded in for the ones that are
	 * letters. Folded here rather than in SQL for the same reason the updates
	 * list did it: "opened" means "at least one hit that was not a scanner",
	 * and which hits those are is a judgement that lives in one predicate.
	 */
	list: protectedProcedure.query(async ({ ctx }) => {
		const rows = await ctx.db
			.select({
				id: post.id,
				slug: post.slug,
				name: post.name,
				description: post.description,
				status: post.status,
				visibility: post.visibility,
				kind: post.kind,
				publishedAt: post.publishedAt,
				updatedAt: post.updatedAt,
				ref: link.ref,
				linkCreatedAt: link.createdAt,
				eventId: linkEvent.id,
				eventAgent: linkEvent.userAgent,
			})
			.from(post)
			.leftJoin(link, eq(link.postId, post.id))
			.leftJoin(linkEvent, eq(linkEvent.ref, link.ref))
			.orderBy(desc(post.updatedAt));

		const byPost = new Map<
			string,
			{
				id: string;
				slug: string;
				name: string;
				description: string | null;
				status: (typeof POST_STATUSES)[number];
				visibility: (typeof POST_VISIBILITIES)[number];
				kind: (typeof POST_KINDS)[number];
				publishedAt: Date | null;
				updatedAt: Date;
				sentAt: Date | null;
				recipients: Set<string>;
				opened: Set<string>;
			}
		>();

		for (const row of rows) {
			let entry = byPost.get(row.id);
			if (!entry) {
				entry = {
					id: row.id,
					slug: row.slug,
					name: row.name,
					description: row.description,
					status: row.status,
					visibility: row.visibility,
					kind: row.kind,
					publishedAt: row.publishedAt,
					updatedAt: row.updatedAt,
					sentAt: null,
					recipients: new Set(),
					opened: new Set(),
				};
				byPost.set(row.id, entry);
			}

			if (row.ref) entry.recipients.add(row.ref);

			// Nothing here emails anything: a link is minted and the message is
			// written by hand. So the moment a post went out is the moment its
			// first link did, and there is no second column to disagree with it.
			if (
				row.linkCreatedAt &&
				(!entry.sentAt || row.linkCreatedAt < entry.sentAt)
			) {
				entry.sentAt = row.linkCreatedAt;
			}

			if (
				row.ref &&
				row.eventId !== null &&
				!isAutomatedClick(row.eventAgent)
			) {
				entry.opened.add(row.ref);
			}
		}

		return [...byPost.values()].map(({ recipients, opened, ...entry }) => ({
			...entry,
			recipients: recipients.size,
			opened: opened.size,
		}));
	}),

	/** The post and, when it is a letter, who has a link and who has opened it. */
	byId: protectedProcedure
		.input(z.object({ id: z.uuid() }))
		.query(async ({ ctx, input }) => {
			const row = await load(ctx.db, input.id);

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
				.where(eq(link.postId, input.id))
				.orderBy(asc(contact.email));

			const events = await ctx.db
				.select({
					ref: linkEvent.ref,
					at: linkEvent.createdAt,
					userAgent: linkEvent.userAgent,
				})
				.from(linkEvent)
				.innerJoin(link, eq(link.ref, linkEvent.ref))
				.where(eq(link.postId, input.id))
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
				post: row,
				recipients: links.map((entry) => ({
					...entry,
					clicks: stats.get(entry.ref)?.clicks ?? 0,
					firstClickAt: stats.get(entry.ref)?.firstAt ?? null,
				})),
			};
		}),

	/**
	 * An untitled draft. Created empty and saved into rather than filled in a
	 * dialog first: the title of a letter is usually the last thing decided.
	 */
	create: adminProcedure
		.input(z.object({ name: z.string().trim().default("") }).optional())
		.mutation(async ({ ctx, input }) => {
			const name = input?.name?.trim() || "Untitled";

			const [row] = await ctx.db
				.insert(post)
				.values({
					slug: await freeSlug(ctx.db, slugify(name) || "untitled"),
					name,
					doc: EMPTY_DOC,
					createdBy: ctx.user.id,
				})
				.returning();

			await logActivity({
				actorUserId: ctx.user.id,
				entityType: "post",
				entityId: row.id,
				verb: "created",
				newValue: row.name,
			});

			return row;
		}),

	/**
	 * The autosave. Everything the editor holds, every couple of seconds.
	 *
	 * The slug follows the title while the post is a draft and is refused once
	 * it is published, which is the whole of the URL contract: a published
	 * address is in somebody's inbox and does not move, and the title above it
	 * is free forever.
	 */
	update: adminProcedure
		.input(
			postInput.partial().extend({ id: z.uuid(), slug: slugInput.optional() }),
		)
		.mutation(async ({ ctx, input }) => {
			const { id, ...patch } = input;
			const before = await load(ctx.db, id);
			const published = before.status === "published";

			if (patch.slug && published && patch.slug !== before.slug) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "A published post keeps its address.",
				});
			}

			const kind = patch.kind ?? before.kind;
			const slug =
				published || patch.slug === undefined
					? before.slug
					: await freeSlug(ctx.db, patch.slug, id);

			const [row] = await ctx.db
				.update(post)
				.set({
					...patch,
					slug,
					visibility: visibilityFor(
						kind,
						patch.visibility ?? before.visibility,
					),
					updatedAt: new Date(),
				})
				.where(eq(post.id, id))
				.returning();

			// The document changes on every keystroke and says nothing in a log.
			// Everything else is a decision worth a line.
			await logActivity(
				fieldChanges(
					{ actorUserId: ctx.user.id, entityType: "post", entityId: id },
					before,
					{ ...patch, slug },
					[
						"name",
						"slug",
						"description",
						"subtitle",
						"dateLabel",
						"kind",
						"visibility",
					],
				),
			);

			await reindexQuietly(() => indexPosts({ ids: [id] }));

			return row;
		}),

	/**
	 * Live at its URL. Snapshots the document first: autosave is continuous and
	 * cheap to lose a second of, and this is the moment the text stops being
	 * only yours.
	 */
	publish: adminProcedure
		.input(z.object({ id: z.uuid() }))
		.mutation(async ({ ctx, input }) => {
			const before = await load(ctx.db, input.id);

			await ctx.db.insert(postRevision).values({
				postId: before.id,
				name: before.name,
				doc: before.doc,
				createdBy: ctx.user.id,
			});

			const [row] = await ctx.db
				.update(post)
				.set({
					status: "published",
					publishedAt: before.publishedAt ?? new Date(),
					updatedAt: new Date(),
				})
				.where(eq(post.id, input.id))
				.returning();

			await logActivity({
				actorUserId: ctx.user.id,
				entityType: "post",
				entityId: row.id,
				verb: "published",
				newValue: row.slug,
			});

			await reindexQuietly(() => indexPosts({ ids: [row.id] }));

			return row;
		}),

	/** Back to a draft. The URL starts answering 404, including for its readers. */
	unpublish: adminProcedure
		.input(z.object({ id: z.uuid() }))
		.mutation(async ({ ctx, input }) => {
			const [row] = await ctx.db
				.update(post)
				.set({ status: "draft", updatedAt: new Date() })
				.where(eq(post.id, input.id))
				.returning();

			if (!row) {
				throw new TRPCError({ code: "NOT_FOUND", message: "No such post." });
			}

			await logActivity({
				actorUserId: ctx.user.id,
				entityType: "post",
				entityId: row.id,
				verb: "unpublished",
				oldValue: row.slug,
			});

			return row;
		}),

	/** Backdating, for a date got wrong. Only ever set on a published post. */
	setPublishedAt: adminProcedure
		.input(z.object({ id: z.uuid(), publishedAt: z.date() }))
		.mutation(async ({ ctx, input }) => {
			const [row] = await ctx.db
				.update(post)
				.set({ publishedAt: input.publishedAt, updatedAt: new Date() })
				.where(eq(post.id, input.id))
				.returning();

			if (!row) {
				throw new TRPCError({ code: "NOT_FOUND", message: "No such post." });
			}

			return row;
		}),

	/**
	 * Gone, with its revisions. The database refuses this while links point at
	 * it (`on delete restrict`); the check here is so the refusal arrives as a
	 * sentence rather than a constraint violation.
	 */
	remove: adminProcedure
		.input(z.object({ id: z.uuid() }))
		.mutation(async ({ ctx, input }) => {
			const row = await load(ctx.db, input.id);

			const [sent] = await ctx.db
				.select({ id: link.id })
				.from(link)
				.where(eq(link.postId, input.id))
				.limit(1);

			if (sent) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "This has been sent. Revoke its links first.",
				});
			}

			await ctx.db.delete(post).where(eq(post.id, input.id));

			await logActivity({
				actorUserId: ctx.user.id,
				entityType: "post",
				entityId: row.id,
				verb: "deleted",
				oldValue: row.name,
			});

			return { deleted: true };
		}),

	/* ---------------------------------------------------------------- *
	 * In bulk, from the list's selection.
	 *
	 * One request rather than one per row, and each of these reports what it
	 * actually did: a bulk action that silently skips half its input is worse
	 * than one that refuses outright.
	 * ---------------------------------------------------------------- */

	publishMany: adminProcedure
		.input(z.object({ ids: z.array(z.uuid()).min(1).max(200) }))
		.mutation(async ({ ctx, input }) => {
			const rows = await ctx.db
				.select()
				.from(post)
				.where(and(inArray(post.id, input.ids), eq(post.status, "draft")));

			if (rows.length === 0) return { published: 0, skipped: input.ids.length };

			// The same snapshot `publish` takes, for the same reason: this is
			// the moment the text stops being only yours.
			await ctx.db.insert(postRevision).values(
				rows.map((row) => ({
					postId: row.id,
					name: row.name,
					doc: row.doc,
					createdBy: ctx.user.id,
				})),
			);

			const now = new Date();
			for (const row of rows) {
				await ctx.db
					.update(post)
					.set({
						status: "published",
						publishedAt: row.publishedAt ?? now,
						updatedAt: now,
					})
					.where(eq(post.id, row.id));
			}

			await logActivity(
				rows.map((row) => ({
					actorUserId: ctx.user.id,
					entityType: "post" as const,
					entityId: row.id,
					verb: "published",
					newValue: row.slug,
				})),
			);

			await reindexQuietly(() =>
				indexPosts({ ids: rows.map((row) => row.id) }),
			);

			return {
				published: rows.length,
				skipped: input.ids.length - rows.length,
			};
		}),

	unpublishMany: adminProcedure
		.input(z.object({ ids: z.array(z.uuid()).min(1).max(200) }))
		.mutation(async ({ ctx, input }) => {
			const rows = await ctx.db
				.update(post)
				.set({ status: "draft", updatedAt: new Date() })
				.where(and(inArray(post.id, input.ids), eq(post.status, "published")))
				.returning({ id: post.id, slug: post.slug });

			await logActivity(
				rows.map((row) => ({
					actorUserId: ctx.user.id,
					entityType: "post" as const,
					entityId: row.id,
					verb: "unpublished",
					oldValue: row.slug,
				})),
			);

			return {
				unpublished: rows.length,
				skipped: input.ids.length - rows.length,
			};
		}),

	/**
	 * Listed at `/writing`, or not. Letters are left alone: a letter is
	 * unlisted by definition, and quietly publishing a batch of them to the
	 * blog because they were caught in a selection is the one mistake here
	 * that cannot be taken back.
	 */
	setVisibilityMany: adminProcedure
		.input(
			z.object({
				ids: z.array(z.uuid()).min(1).max(200),
				visibility: z.enum(POST_VISIBILITIES),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const rows = await ctx.db
				.update(post)
				.set({ visibility: input.visibility, updatedAt: new Date() })
				.where(and(inArray(post.id, input.ids), eq(post.kind, "post")))
				.returning({ id: post.id, slug: post.slug });

			await logActivity(
				rows.map((row) => ({
					actorUserId: ctx.user.id,
					entityType: "post" as const,
					entityId: row.id,
					verb: "updated",
					field: "visibility",
					newValue: input.visibility,
				})),
			);

			return { changed: rows.length, skipped: input.ids.length - rows.length };
		}),

	/**
	 * Deletes the ones nobody has been sent. The rest are reported back by
	 * name, because "3 of 5 deleted" without saying which three is a worse
	 * answer than not running at all.
	 */
	removeMany: adminProcedure
		.input(z.object({ ids: z.array(z.uuid()).min(1).max(200) }))
		.mutation(async ({ ctx, input }) => {
			const sent = new Set(
				(
					await ctx.db
						.select({ postId: link.postId })
						.from(link)
						.where(inArray(link.postId, input.ids))
				).map((row) => row.postId),
			);

			const rows = await ctx.db
				.select({ id: post.id, name: post.name })
				.from(post)
				.where(inArray(post.id, input.ids));

			const deletable = rows.filter((row) => !sent.has(row.id));
			if (deletable.length > 0) {
				await ctx.db.delete(post).where(
					inArray(
						post.id,
						deletable.map((row) => row.id),
					),
				);

				await logActivity(
					deletable.map((row) => ({
						actorUserId: ctx.user.id,
						entityType: "post" as const,
						entityId: row.id,
						verb: "deleted",
						oldValue: row.name,
					})),
				);
			}

			return {
				deleted: deletable.length,
				kept: rows.filter((row) => sent.has(row.id)).map((row) => row.name),
			};
		}),

	/** What was published, when. The document is fetched one at a time. */
	revisions: protectedProcedure
		.input(z.object({ postId: z.uuid() }))
		.query(async ({ ctx, input }) =>
			ctx.db
				.select({
					id: postRevision.id,
					name: postRevision.name,
					createdAt: postRevision.createdAt,
					createdBy: postRevision.createdBy,
				})
				.from(postRevision)
				.where(eq(postRevision.postId, input.postId))
				.orderBy(desc(postRevision.createdAt)),
		),

	/**
	 * Puts a revision back into the post, after snapshotting what is there now.
	 * Restoring is itself undoable, which is the only thing that makes pressing
	 * it reasonable.
	 */
	restoreRevision: adminProcedure
		.input(z.object({ id: z.uuid() }))
		.mutation(async ({ ctx, input }) => {
			const [revision] = await ctx.db
				.select()
				.from(postRevision)
				.where(eq(postRevision.id, input.id))
				.limit(1);

			if (!revision) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "No such revision.",
				});
			}

			const before = await load(ctx.db, revision.postId);

			await ctx.db.insert(postRevision).values({
				postId: before.id,
				name: before.name,
				doc: before.doc,
				createdBy: ctx.user.id,
			});

			const [row] = await ctx.db
				.update(post)
				.set({
					name: revision.name,
					doc: revision.doc,
					updatedAt: new Date(),
				})
				.where(eq(post.id, revision.postId))
				.returning();

			await logActivity({
				actorUserId: ctx.user.id,
				entityType: "post",
				entityId: row.id,
				verb: "restored",
				newValue: revision.createdAt.toISOString(),
			});

			await reindexQuietly(() => indexPosts({ ids: [row.id] }));

			return row;
		}),
});
