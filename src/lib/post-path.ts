/**
 * Split out of posts.ts so a client component can link to a post without
 * importing the module that inlines every post's text.
 */
export function postPath(slug: string) {
	return `/writing/${slug}`;
}
