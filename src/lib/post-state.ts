/**
 * What a post is and where it can be read. Its own module so the schema, the
 * procedures and the pages read one list.
 *
 * Three fields, and they answer different questions. `status` is whether the
 * post is live at its URL at all. `visibility` is whether it is listed at
 * `/writing`. `kind` is whether it is a letter somebody was sent.
 *
 * They are separate because a letter spends its whole life as `published` and
 * `private`: reachable by anyone holding the link, listed nowhere, noindex.
 * Folded into one enum that state would be unrepresentable alongside "a draft
 * of that letter", which is what every letter is the hour before it goes out.
 *
 * Defaults fail closed. A new post is a private draft and only an explicit
 * publish changes that.
 */
export const POST_STATUSES = ["draft", "published"] as const;
export const POST_VISIBILITIES = ["public", "private"] as const;
export const POST_KINDS = ["post", "letter"] as const;

export type PostStatus = (typeof POST_STATUSES)[number];
export type PostVisibility = (typeof POST_VISIBILITIES)[number];
export type PostKind = (typeof POST_KINDS)[number];

export const POST_STATUS_LABEL: Record<PostStatus, string> = {
	draft: "Draft",
	published: "Published",
};

export const POST_VISIBILITY_LABEL: Record<PostVisibility, string> = {
	public: "Public",
	private: "Private",
};

export const POST_KIND_LABEL: Record<PostKind, string> = {
	post: "Post",
	letter: "Letter",
};

/**
 * A letter is always unlisted. One that turned up at `/writing` between the
 * blog posts would be a mistake rather than a choice, so the editor greys the
 * control and this is what it reads.
 */
export function visibilityFor(
	kind: PostKind,
	chosen: PostVisibility,
): PostVisibility {
	return kind === "letter" ? "private" : chosen;
}

/**
 * Title to slug, while the post is still a draft. Frozen on publish, so this
 * runs on every keystroke until it runs for the last time.
 *
 * Unicode is folded rather than dropped: "Café" gives `cafe`, not `caf`.
 */
export function slugify(title: string): string {
	return title
		.normalize("NFKD")
		.replace(/\p{M}/gu, "")
		.toLowerCase()
		.replace(/['’]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 80)
		.replace(/-+$/, "");
}
