import { db } from "@/db";
import { post } from "@/db/schema";
import { auth } from "@/lib/auth";
import { type Json, excerpt } from "@/lib/post-doc";
import type { PostKind, PostVisibility } from "@/lib/post-state";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, desc, eq } from "drizzle-orm";

/**
 * The only way a public route may reach a post.
 *
 * Server functions rather than tRPC, deliberately. `procedures.test.ts`
 * enforces that every router procedure is protected unless somebody wrote
 * down an argument for why it is not, and a public posts router would live on
 * that list forever. These run on the server, return one post or a list of
 * summaries, and hand the client only what it asked to read.
 *
 * A draft is a 404 for everybody except a signed-in admin, which is what makes
 * `/admin/writing/$id/preview` render the real page rather than an
 * approximation of it.
 */
export type PublicPost = {
	id: string;
	slug: string;
	name: string;
	description: string;
	subtitle: string | null;
	visibility: PostVisibility;
	kind: PostKind;
	date: string;
	/**
	 * The ProseMirror document, for `PostBody` to walk. Typed loosely here
	 * rather than as `PostDoc`: a server function's return type is checked
	 * against what JSON can carry, and a recursive node type is not something
	 * that check can see the end of.
	 */
	doc: Json;
	isDraft: boolean;
};

export type PostSummary = Omit<PublicPost, "doc" | "subtitle" | "isDraft">;

/**
 * "Sep 10, 2026" unless the post asked for something else. A letter dated by
 * the month is dated by the month on purpose; `date_label` is where that
 * choice lives, and `published_at` still does the ordering.
 */
function dateOf(row: { publishedAt: Date | null; dateLabel: string | null }) {
	if (row.dateLabel) return row.dateLabel;
	if (!row.publishedAt) return "";
	return row.publishedAt.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		timeZone: "UTC",
	});
}

type Row = typeof post.$inferSelect;

function shape(row: Row): PublicPost {
	return {
		id: row.id,
		slug: row.slug,
		name: row.name,
		description: row.description ?? excerpt(row.doc),
		subtitle: row.subtitle,
		visibility: row.visibility,
		kind: row.kind,
		date: dateOf(row),
		doc: row.doc as Json,
		isDraft: row.status !== "published",
	};
}

async function viewerIsAdmin() {
	try {
		const request = getRequest();
		const session = await auth().api.getSession({ headers: request.headers });
		return Boolean(session?.user);
	} catch {
		return false;
	}
}

export const fetchPost = createServerFn({ method: "GET" })
	.inputValidator((data: { slug: string }) => data)
	.handler(async ({ data }): Promise<{ post: PublicPost | null }> => {
		const [row] = await db()
			.select()
			.from(post)
			.where(eq(post.slug, data.slug))
			.limit(1);

		if (!row) return { post: null };

		// A draft has no readers yet. The admin preview is the exception, and it
		// is an exception the reader can see: `isDraft` puts a bar on the page.
		if (row.status !== "published" && !(await viewerIsAdmin())) {
			return { post: null };
		}

		return { post: shape(row) };
	});

/**
 * The same post, addressed by id rather than by slug, for the admin preview.
 * A draft has no slug worth typing and its address can still change; the id
 * is what the editor has in its URL.
 */
export const fetchPostById = createServerFn({ method: "GET" })
	.inputValidator((data: { id: string }) => data)
	.handler(async ({ data }): Promise<{ post: PublicPost | null }> => {
		const [row] = await db()
			.select()
			.from(post)
			.where(eq(post.id, data.id))
			.limit(1);

		if (!row) return { post: null };
		if (row.status !== "published" && !(await viewerIsAdmin())) {
			return { post: null };
		}

		return { post: shape(row) };
	});

export const fetchPublicPosts = createServerFn({ method: "GET" }).handler(
	async (): Promise<{ posts: PostSummary[] }> => {
		const rows = await db()
			.select({
				id: post.id,
				slug: post.slug,
				name: post.name,
				description: post.description,
				visibility: post.visibility,
				kind: post.kind,
				doc: post.doc,
				publishedAt: post.publishedAt,
				dateLabel: post.dateLabel,
			})
			.from(post)
			.where(and(eq(post.status, "published"), eq(post.visibility, "public")))
			.orderBy(desc(post.publishedAt));

		return {
			posts: rows.map((row) => ({
				id: row.id,
				slug: row.slug,
				name: row.name,
				description: row.description ?? excerpt(row.doc),
				visibility: row.visibility,
				kind: row.kind,
				date: dateOf(row),
			})),
		};
	},
);
