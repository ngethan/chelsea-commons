/**
 * The one custom node. A `photos` block is a row of images with alt text, and
 * it is the only thing in a post that is neither prose nor a list.
 *
 * Shared by the editor's node view and the public renderer so the grid a
 * person arranges is the grid a reader sees, rather than two layouts that
 * agree today.
 */
export type Photo = { src: string; alt: string };

/**
 * One photo reads as a figure and gets the full column; a set reads as a
 * contact sheet. Two columns for two or four, so a set of four is a square
 * rather than a row of three with one stranded underneath.
 */
export function photoColumns(count: number): string {
	if (count === 1) return "grid-cols-1";
	if (count === 2 || count === 4) return "grid-cols-2";
	return "grid-cols-2 md:grid-cols-3";
}

/**
 * Through Vercel's image CDN, which the `images` block in `vercel.json` turns
 * on for the blob host. A blob URL is already on an edge CDN; this is what
 * stops a 4MB phone photo being sent at 4MB to fill a 400px column.
 *
 * Anything not on the blob host (a file under `public/`) is passed through
 * untouched: the optimizer only accepts hosts on the allowlist, and handing it
 * one it will refuse turns a working image into a broken one.
 */
export function optimized(src: string, width: number): string {
	if (!optimizable(src)) return src;
	return `/_vercel/image?url=${encodeURIComponent(src)}&w=${width}&q=80`;
}

/**
 * Whether a source can be resized at all. A file under `public/` cannot: the
 * optimizer only accepts hosts on the allowlist in `vercel.json`. Callers use
 * this to decide whether to emit a `srcset`, because three identical URLs
 * carrying three different width descriptors is a lie the browser believes.
 */
export function optimizable(src: string): boolean {
	// `/_vercel/image` is the platform's, not the app's. In dev nothing serves
	// that path, so the request falls through to the catch-all route and the
	// image tag is handed the HTML app shell: every photo in every post breaks
	// on localhost. The blob URL is a public CDN URL and loads anywhere, so
	// that is what dev gets, unresized.
	if (import.meta.env.DEV) return false;
	return src.includes(".public.blob.vercel-storage.com");
}

/** Survives a hand-edited attribute, a half-finished paste, or an old row. */
export function parsePhotos(value: unknown): Photo[] {
	if (!Array.isArray(value)) return [];
	return value
		.map((entry) => {
			if (typeof entry === "string") return { src: entry, alt: "" };
			if (!entry || typeof entry !== "object") return null;
			const { src, alt } = entry as Record<string, unknown>;
			if (typeof src !== "string" || !src) return null;
			return { src, alt: typeof alt === "string" ? alt : "" };
		})
		.filter((photo): photo is Photo => photo !== null);
}
