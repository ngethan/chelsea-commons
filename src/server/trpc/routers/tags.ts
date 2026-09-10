import type { Db } from "@/db";
import { contact, tag } from "@/db/schema";
import { indexContacts, reindexQuietly } from "@/server/search";
import { TRPCError } from "@trpc/server";
import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { logActivity } from "../activity";
import { createTRPCRouter, protectedProcedure } from "../init";

const name = z.string().trim().min(1, "A tag needs a name.").max(60);

/**
 * The tag registry. Assigning and removing a tag on one person is a
 * contact update; this router is for the set of tags itself, and for the
 * two operations that touch every contact at once (rename, delete).
 */
export const tagsRouter = createTRPCRouter({
	/** Every tag, with how many live contacts carry it. */
	list: protectedProcedure.query(async ({ ctx }) => {
		return ctx.db
			.select({
				id: tag.id,
				name: tag.name,
				createdAt: tag.createdAt,
				count: sql<number>`(
					select count(*)::int from ${contact}
					where ${contact.deletedAt} is null and ${tag.name} = any(${contact.tags})
				)`,
			})
			.from(tag)
			.orderBy(asc(sql`lower(${tag.name})`));
	}),

	/**
	 * Makes a tag, or returns the one that already has that name in any
	 * case, so "Advisor" typed into the picker lands on "advisor".
	 */
	create: protectedProcedure
		.input(z.object({ name }))
		.mutation(async ({ ctx, input }) => {
			const [existing] = await ctx.db
				.select()
				.from(tag)
				.where(eq(sql`lower(${tag.name})`, input.name.toLowerCase()))
				.limit(1);
			if (existing) return existing;

			const [row] = await ctx.db
				.insert(tag)
				.values({ name: input.name, createdBy: ctx.user.id })
				.returning();

			await logActivity({
				actorUserId: ctx.user.id,
				entityType: "tag",
				entityId: row.id,
				verb: "created",
				newValue: row.name,
			});

			return row;
		}),

	/** Renames the tag and every contact's copy of it. */
	rename: protectedProcedure
		.input(z.object({ id: z.uuid(), name }))
		.mutation(async ({ ctx, input }) => {
			const [before] = await ctx.db
				.select()
				.from(tag)
				.where(eq(tag.id, input.id))
				.limit(1);
			if (!before) {
				throw new TRPCError({ code: "NOT_FOUND", message: "No such tag." });
			}
			if (before.name === input.name) return before;

			const [clash] = await ctx.db
				.select({ id: tag.id })
				.from(tag)
				.where(eq(sql`lower(${tag.name})`, input.name.toLowerCase()))
				.limit(1);
			if (clash && clash.id !== before.id) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "A tag with that name already exists.",
				});
			}

			const [row] = await ctx.db
				.update(tag)
				.set({ name: input.name })
				.where(eq(tag.id, input.id))
				.returning();

			const touched = await ctx.db
				.update(contact)
				.set({
					tags: sql`array_replace(${contact.tags}, ${before.name}, ${input.name})`,
				})
				.where(sql`${before.name} = any(${contact.tags})`)
				.returning({ id: contact.id });

			await logActivity({
				actorUserId: ctx.user.id,
				entityType: "tag",
				entityId: row.id,
				verb: "renamed",
				oldValue: before.name,
				newValue: row.name,
			});

			if (touched.length) {
				await reindexQuietly(() =>
					indexContacts({ ids: touched.map((t) => t.id) }),
				);
			}

			return row;
		}),

	/** Deletes the tag and takes it off everybody who had it. */
	remove: protectedProcedure
		.input(z.object({ id: z.uuid() }))
		.mutation(async ({ ctx, input }) => {
			const [row] = await ctx.db
				.delete(tag)
				.where(eq(tag.id, input.id))
				.returning();
			if (!row) return { deleted: false };

			const touched = await ctx.db
				.update(contact)
				.set({ tags: sql`array_remove(${contact.tags}, ${row.name})` })
				.where(sql`${row.name} = any(${contact.tags})`)
				.returning({ id: contact.id });

			await logActivity({
				actorUserId: ctx.user.id,
				entityType: "tag",
				entityId: row.id,
				verb: "deleted",
				oldValue: row.name,
			});

			if (touched.length) {
				await reindexQuietly(() =>
					indexContacts({ ids: touched.map((t) => t.id) }),
				);
			}

			return { deleted: true, removedFrom: touched.length };
		}),
});

/**
 * Makes sure every name in a contact's tags is in the registry, spelled as
 * the registry already has it. Called by the contact mutations, so a tag
 * typed by the assistant or pasted in bulk exists in the picker afterwards.
 * Returns the names in their canonical spelling.
 */
export async function registerTags(
	db: Db,
	names: string[],
	createdBy: string | null,
): Promise<string[]> {
	const wanted = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
	if (wanted.length === 0) return [];

	const existing = await db
		.select({ name: tag.name })
		.from(tag)
		.where(
			sql`lower(${tag.name}) in (${sql.join(
				wanted.map((n) => sql`${n.toLowerCase()}`),
				sql`, `,
			)})`,
		);
	const canonical = new Map(
		existing.map((t) => [t.name.toLowerCase(), t.name]),
	);

	const missing = wanted.filter((n) => !canonical.has(n.toLowerCase()));
	if (missing.length) {
		const made = await db
			.insert(tag)
			.values(missing.map((n) => ({ name: n, createdBy })))
			.onConflictDoNothing()
			.returning({ name: tag.name });
		for (const t of made) canonical.set(t.name.toLowerCase(), t.name);
	}

	return wanted.map((n) => canonical.get(n.toLowerCase()) ?? n);
}
