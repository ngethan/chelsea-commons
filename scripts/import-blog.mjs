import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

/**
 * Throwaway. Reads `content/blog/*.md` into the `post` table once, then gets
 * deleted along with the directory it read.
 *
 * Markdown to ProseMirror, by hand rather than through a library, because the
 * job is small and specific: these five files are prose, headings, lists,
 * blockquotes, rules, and one custom fence. Everything the old renderer could
 * do beyond that (```partners, ```moonshots, ```cards) is going away with the
 * one letter that used it, so there is nothing here to be general about.
 *
 * Run with: node --env-file=.env.local scripts/import-blog.mjs
 */
const url = process.env.DATABASE_URL;
if (!url) {
	console.error("DATABASE_URL is not set. Expected it in .env.local.");
	process.exit(1);
}

const sql = neon(url);
const DIR = "content/blog";

/** The one letter being dropped: it is old, and it is the only user of the
 * two blocks that are not being rebuilt. */
const SKIP = new Set(["2026-09-to-our-collaborators"]);

function frontmatter(raw) {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
	if (!match) return { attrs: {}, body: raw };

	const attrs = {};
	for (const line of match[1].split(/\r?\n/)) {
		const kv = line.match(/^(\w+):\s*(.*)$/);
		if (kv) attrs[kv[1]] = kv[2].trim();
	}
	return { attrs, body: raw.slice(match[0].length) };
}

/**
 * Inline marks. Order matters: code first, so `**` inside a code span is not
 * read as bold. Link text is walked again so a bold word inside a link keeps
 * both marks.
 */
function inline(text) {
	const out = [];
	const pattern =
		/(`[^`]+`)|(\[([^\]]+)\]\(([^)]+)\))|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(_[^_]+_)/;

	let rest = text;
	while (rest) {
		const match = rest.match(pattern);
		if (!match) {
			if (rest) out.push({ type: "text", text: rest });
			break;
		}
		if (match.index > 0) {
			out.push({ type: "text", text: rest.slice(0, match.index) });
		}

		const token = match[0];
		if (match[1]) {
			out.push({
				type: "text",
				text: token.slice(1, -1),
				marks: [{ type: "code" }],
			});
		} else if (match[2]) {
			for (const node of inline(match[3])) {
				node.marks = [
					...(node.marks ?? []),
					{ type: "link", attrs: { href: match[4] } },
				];
				out.push(node);
			}
		} else if (match[5]) {
			out.push({
				type: "text",
				text: token.slice(2, -2),
				marks: [{ type: "bold" }],
			});
		} else {
			out.push({
				type: "text",
				text: token.slice(1, -1),
				marks: [{ type: "italic" }],
			});
		}

		rest = rest.slice(match.index + token.length);
	}

	// An escaped dash is a literal dash. `\-` opens one of the letters.
	return out
		.map((node) =>
			node.type === "text"
				? { ...node, text: node.text.replace(/\\([-*_`[\]])/g, "$1") }
				: node,
		)
		.filter((node) => node.type !== "text" || node.text.length > 0);
}

function paragraph(text) {
	return { type: "paragraph", content: inline(text) };
}

function photos(body) {
	const items = body
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => {
			const [src, ...rest] = line.split("|");
			return { src: src.trim(), alt: rest.join("|").trim() };
		});
	return { type: "photos", attrs: { photos: items } };
}

function convert(markdown) {
	const lines = markdown.split(/\r?\n/);
	const content = [];
	let i = 0;

	const flush = (buffer) => {
		if (buffer.length) content.push(paragraph(buffer.join(" ").trim()));
		buffer.length = 0;
	};

	const buffer = [];

	while (i < lines.length) {
		const line = lines[i];

		const fence = line.match(/^\s*(?:```|~~~)\s*(\w*)\s*$/);
		if (fence) {
			flush(buffer);
			const lang = fence[1];
			const body = [];
			i += 1;
			while (i < lines.length && !/^\s*(?:```|~~~)\s*$/.test(lines[i])) {
				body.push(lines[i]);
				i += 1;
			}
			i += 1;

			if (lang === "photos") {
				content.push(photos(body.join("\n")));
			} else if (lang === "partners" || lang === "moonshots") {
				// Both are gone. What they held was a list of lines, so that is
				// what they become; nothing is silently dropped.
				content.push({
					type: "bulletList",
					content: body
						.map((entry) => entry.trim())
						.filter(Boolean)
						.map((entry) => ({
							type: "listItem",
							content: [paragraph(entry)],
						})),
				});
			} else {
				content.push({
					type: "codeBlock",
					content: [{ type: "text", text: body.join("\n") }],
				});
			}
			continue;
		}

		if (!line.trim()) {
			flush(buffer);
			i += 1;
			continue;
		}

		const heading = line.match(/^(#{1,6})\s+(.*)$/);
		if (heading) {
			flush(buffer);
			content.push({
				type: "heading",
				attrs: { level: heading[1].length },
				content: inline(heading[2].trim()),
			});
			i += 1;
			continue;
		}

		if (/^\s*(?:---|\*\*\*|___)\s*$/.test(line)) {
			flush(buffer);
			content.push({ type: "horizontalRule" });
			i += 1;
			continue;
		}

		const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
		const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
		if (bullet || numbered) {
			flush(buffer);
			const ordered = Boolean(numbered);
			const items = [];
			while (i < lines.length) {
				const next = lines[i].match(
					ordered ? /^\s*\d+[.)]\s+(.*)$/ : /^\s*[-*+]\s+(.*)$/,
				);
				if (!next) break;
				items.push({ type: "listItem", content: [paragraph(next[1].trim())] });
				i += 1;
			}
			content.push({
				type: ordered ? "orderedList" : "bulletList",
				content: items,
			});
			continue;
		}

		const quote = line.match(/^\s*>\s?(.*)$/);
		if (quote) {
			flush(buffer);
			const parts = [];
			while (i < lines.length) {
				const next = lines[i].match(/^\s*>\s?(.*)$/);
				if (!next) break;
				parts.push(next[1]);
				i += 1;
			}
			content.push({
				type: "blockquote",
				content: [paragraph(parts.join(" ").trim())],
			});
			continue;
		}

		buffer.push(line.trim());
		i += 1;
	}

	flush(buffer);
	return { type: "doc", content };
}

const MONTHS = "jan feb mar apr may jun jul aug sep oct nov dec".split(" ");

/** "Sep 10, 2026" or "Sep 2026", the two shapes the frontmatter used. */
function publishedAt(value) {
	const match = String(value ?? "")
		.trim()
		.match(/^([A-Za-z]{3,9})\s+(?:(\d{1,2}),?\s+)?(\d{4})$/);
	if (!match) return null;
	const month = MONTHS.indexOf(match[1].slice(0, 3).toLowerCase());
	if (month < 0) return null;
	return new Date(
		Date.UTC(Number(match[3]), month, match[2] ? Number(match[2]) : 1),
	);
}

let imported = 0;

for (const file of readdirSync(DIR).filter((f) => f.endsWith(".md"))) {
	const slug = file.replace(/\.md$/, "");
	if (SKIP.has(slug)) {
		console.log(`skipped ${slug}`);
		continue;
	}

	const { attrs, body } = frontmatter(readFileSync(join(DIR, file), "utf8"));
	const doc = convert(body);
	const at = publishedAt(attrs.date);

	// A bare month was a choice about the writing, so it is kept as the label
	// rather than rendered back as the first of the month.
	const label = /^[A-Za-z]{3,9}\s+\d{4}$/.test(attrs.date ?? "")
		? attrs.date
		: null;

	// Upsert on slug: migration 0009 already made a row for anything that had
	// been sent, and this is what fills it in.
	await sql`
		INSERT INTO post (slug, name, description, subtitle, doc, status, visibility, kind, published_at, date_label)
		VALUES (
			${slug},
			${attrs.name ?? slug},
			${attrs.description ?? null},
			${attrs.subtitle ?? null},
			${JSON.stringify(doc)}::jsonb,
			'published',
			${attrs.visibility === "public" ? "public" : "private"},
			'post',
			${at ? at.toISOString() : null},
			${label}
		)
		ON CONFLICT (slug) DO UPDATE SET
			name = EXCLUDED.name,
			description = EXCLUDED.description,
			subtitle = EXCLUDED.subtitle,
			doc = EXCLUDED.doc,
			published_at = COALESCE(post.published_at, EXCLUDED.published_at),
			date_label = EXCLUDED.date_label
	`;

	imported += 1;
	console.log(`imported ${slug} (${doc.content.length} blocks)`);
}

console.log(`\n${imported} posts imported. Read them, then delete ${DIR}.`);
