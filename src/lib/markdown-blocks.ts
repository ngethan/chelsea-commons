/**
 * A handful of fenced blocks the markdown renderer understands, so an update
 * can keep the logo grid and card layouts without leaving markdown for MDX or
 * raw HTML. Anything not in this list stays an ordinary code block.
 */
export const CUSTOM_FENCES = [
	"partners",
	"moonshots",
	"cards",
	"photos",
] as const;

export type CustomFence = (typeof CUSTOM_FENCES)[number];

export type Card = { title: string; body: string };
export type Photo = { src: string; alt: string };

export type Block =
	| { kind: "markdown"; text: string }
	| { kind: "partners"; names: string[] }
	| { kind: "moonshots"; items: string[] }
	| { kind: "cards"; cards: Card[] }
	| { kind: "photos"; photos: Photo[] };

const FENCE_RE = /^(\s*)(`{3,}|~{3,})\s*([^\s`~]*)/;

function isCustomFence(lang: string): lang is CustomFence {
	return (CUSTOM_FENCES as readonly string[]).includes(lang);
}

function nonEmptyLines(body: string) {
	return body
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
}

/** `path.webp | Alt text`, with the alt optional. */
function parsePhotos(body: string): Photo[] {
	return nonEmptyLines(body).map((line) => {
		const [src, ...rest] = line.split("|");
		return { src: src.trim(), alt: rest.join("|").trim() };
	});
}

/** Title on the first line, body under it, `---` between cards. */
function parseCards(body: string): Card[] {
	return body
		.split(/^\s*---\s*$/m)
		.map((chunk) => {
			const lines = nonEmptyLines(chunk);
			if (lines.length === 0) return null;
			return { title: lines[0], body: lines.slice(1).join(" ") };
		})
		.filter((card): card is Card => card !== null);
}

function toBlock(fence: CustomFence, body: string): Block {
	switch (fence) {
		case "partners":
			return { kind: "partners", names: nonEmptyLines(body) };
		case "moonshots":
			return { kind: "moonshots", items: nonEmptyLines(body) };
		case "cards":
			return { kind: "cards", cards: parseCards(body) };
		case "photos":
			return { kind: "photos", photos: parsePhotos(body) };
	}
}

/**
 * Splits a document into ordinary markdown runs and custom blocks. Fence state
 * is tracked for every fence, not just the custom ones, so a ```partners line
 * sitting inside a real code sample is left alone.
 */
export function parseBlocks(markdown: string): Block[] {
	const blocks: Block[] = [];
	const lines = markdown.split("\n");

	let markdownRun: string[] = [];
	let openFence: { marker: string; lang: string; body: string[] } | null = null;

	const flushMarkdown = () => {
		const text = markdownRun.join("\n").trim();
		if (text) {
			blocks.push({ kind: "markdown", text });
		}
		markdownRun = [];
	};

	for (const line of lines) {
		const match = line.match(FENCE_RE);

		if (openFence) {
			// A closing fence is the same character, at least as long, and bare.
			const closing =
				match &&
				match[2][0] === openFence.marker[0] &&
				match[2].length >= openFence.marker.length &&
				match[3] === "";

			if (closing) {
				if (isCustomFence(openFence.lang)) {
					flushMarkdown();
					blocks.push(toBlock(openFence.lang, openFence.body.join("\n")));
				} else {
					markdownRun.push(
						`${openFence.marker}${openFence.lang}`,
						...openFence.body,
						line,
					);
				}
				openFence = null;
			} else {
				openFence.body.push(line);
			}
			continue;
		}

		if (match) {
			openFence = { marker: match[2], lang: match[3], body: [] };
			continue;
		}

		markdownRun.push(line);
	}

	// An unterminated fence is a typo in the source; keep the text rather than
	// dropping the rest of the document on the floor.
	if (openFence) {
		markdownRun.push(`${openFence.marker}${openFence.lang}`, ...openFence.body);
	}
	flushMarkdown();

	return blocks;
}
