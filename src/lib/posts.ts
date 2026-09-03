import fm from "front-matter";

/**
 * Every markdown file in `content/blog` is a post. The frontmatter decides
 * whether it is listed:
 *
 *   name        required  the title, shown on the page and in the index
 *   description required  one line, used as the index blurb and the meta tag
 *   visibility  required  "public" lists it at /writing; "private" does not
 *   date        required  "Sep 2026" or "Sep 3, 2026"; orders the index
 *   subtitle    optional  small label under the title, for letters
 *   tags        optional  shown in the index when present
 *   readTime    optional  shown in the index when present
 *
 * A private post still renders at /writing/<slug> for anyone with the link.
 * It is unlisted and noindex, not access controlled: that is what makes it
 * usable as the landing page for a tracked investor email.
 *
 * Anything unreadable is treated as private, so a typo in the frontmatter
 * fails closed rather than publishing something by accident.
 */
export type Visibility = "public" | "private";

export type Post = {
	slug: string;
	name: string;
	description: string;
	visibility: Visibility;
	date: string;
	subtitle?: string;
	tags?: string[];
	readTime?: string;
	content: string;
};

type Frontmatter = Partial<Omit<Post, "slug" | "content">>;

const GLOB_PREFIX = "../../content/blog/";

const RAW = import.meta.glob("../../content/blog/*.md", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

export function parsePost(slug: string, raw: string): Post {
	const { attributes, body } = fm<Frontmatter>(raw);
	return {
		slug,
		name: attributes.name ?? slug,
		description: attributes.description ?? "",
		// Only the exact string publishes. Missing, misspelled, or any other
		// value stays private.
		visibility: attributes.visibility === "public" ? "public" : "private",
		date: attributes.date ?? "",
		subtitle: attributes.subtitle,
		tags: attributes.tags,
		readTime: attributes.readTime,
		content: body,
	};
}

function slugOf(path: string) {
	return path.replace(GLOB_PREFIX, "").replace(".md", "");
}

const MONTHS = [
	"jan",
	"feb",
	"mar",
	"apr",
	"may",
	"jun",
	"jul",
	"aug",
	"sep",
	"oct",
	"nov",
	"dec",
];

/**
 * Accepts a full date ("Sep 3, 2026") or a bare month ("Sep 2026"), which is
 * the day the post is ordered by. Parsed by hand rather than with Date.parse:
 * V8 reads "1 whenever" as a valid date, so delegating would give a garbage
 * frontmatter date a plausible-looking timestamp instead of flagging it.
 * Unparseable dates sort last. UTC keeps server and client agreeing.
 */
export function postTimestamp(date: string): number {
	const match = date
		.trim()
		.match(/^([A-Za-z]{3,9})\s+(?:(\d{1,2}),?\s+)?(\d{4})$/);
	if (!match) return Number.NEGATIVE_INFINITY;

	const month = MONTHS.indexOf(match[1].slice(0, 3).toLowerCase());
	if (month < 0) return Number.NEGATIVE_INFINITY;

	return Date.UTC(Number(match[3]), month, match[2] ? Number(match[2]) : 1);
}

/** Newest first. */
export function listPosts(): Post[] {
	return Object.entries(RAW)
		.map(([path, raw]) => parsePost(slugOf(path), raw))
		.sort((a, b) => postTimestamp(b.date) - postTimestamp(a.date));
}

export function listPublicPosts(): Post[] {
	return listPosts().filter((post) => post.visibility === "public");
}

export function getPost(slug: string): Post | undefined {
	const raw = RAW[`${GLOB_PREFIX}${slug}.md`];
	return raw ? parsePost(slug, raw) : undefined;
}

export { postPath } from "./post-path";
