/**
 * A post's body is a ProseMirror document. This is the small amount of it the
 * server and the list pages need to know: enough to pull the words out, and
 * nothing about how any of it renders.
 *
 * Typed loosely on purpose. The editor's schema decides what node types exist
 * and that list will grow; everything here walks `content` and reads `text`,
 * so a node type nobody here has heard of contributes its words and costs no
 * changes.
 */
/**
 * What survives a round trip through a server function. Spelled out because
 * the boundary's own check rejects `unknown`: a value it cannot promise is
 * JSON is a value it will not serialize.
 */
export type Json =
	| string
	| number
	| boolean
	| null
	| Json[]
	| { [key: string]: Json };

export type PostNode = {
	type: string;
	text?: string;
	content?: PostNode[];
	attrs?: Record<string, unknown>;
};

export type PostDoc = { type: "doc"; content?: PostNode[] };

export const EMPTY_DOC: PostDoc = { type: "doc", content: [] };

/** Nodes whose end is a sentence end, so the flattened text does not run on. */
const BLOCKS = new Set([
	"paragraph",
	"heading",
	"blockquote",
	"listItem",
	"codeBlock",
	"photos",
]);

/**
 * The document as plain text: what gets embedded, what the description falls
 * back to, and what a word count counts.
 */
export function docText(doc: unknown): string {
	const out: string[] = [];

	const walk = (node: PostNode) => {
		if (typeof node.text === "string") out.push(node.text);
		for (const child of node.content ?? []) walk(child);
		if (BLOCKS.has(node.type)) out.push("\n");
	};

	walk((doc ?? EMPTY_DOC) as PostNode);

	return out
		.join("")
		.replace(/\n{2,}/g, "\n")
		.trim();
}

/**
 * The first sentence or so, for a post whose description was left blank. Cut
 * at a word rather than mid-word, and only at the end: a blurb ending in half
 * a word reads as a bug, and one ending in an ellipsis reads as a choice.
 */
export function excerpt(doc: unknown, max = 160): string {
	const text = docText(doc).replace(/\n/g, " ").replace(/\s+/g, " ").trim();
	if (text.length <= max) return text;
	const cut = text.slice(0, max);
	const space = cut.lastIndexOf(" ");
	return `${(space > 40 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** 230 words a minute, rounded up, never zero. */
export function readingMinutes(doc: unknown): number {
	const words = docText(doc).split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.round(words / 230));
}

export function isEmptyDoc(doc: unknown): boolean {
	return docText(doc).length === 0;
}
