import { createServerFn } from "@tanstack/react-start";
import { type Post, getPost, listPublicPosts } from "./posts";

/**
 * The only way a route may reach post content.
 *
 * `posts.ts` inlines every markdown file at build time, so any client-reachable
 * module that imports it drags the full text of every post, private ones
 * included, into the shared browser bundle. Routes therefore go through these
 * server functions: the server reads the files and returns just the one post,
 * or just the summary fields, so a private letter is never shipped to someone
 * who did not open its URL.
 */
export type PostSummary = Pick<
	Post,
	"slug" | "name" | "description" | "visibility" | "date" | "tags" | "readTime"
>;

function summarize(post: Post): PostSummary {
	const { content: _content, subtitle: _subtitle, ...summary } = post;
	return summary;
}

export const fetchPost = createServerFn({ method: "GET" })
	.inputValidator((data: { slug: string }) => data)
	.handler(({ data }) => ({ post: getPost(data.slug) ?? null }));

export const fetchPublicPosts = createServerFn({ method: "GET" }).handler(
	() => ({ posts: listPublicPosts().map(summarize) }),
);
