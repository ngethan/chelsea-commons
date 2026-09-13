import {
	optimizable,
	optimized,
	parsePhotos,
	photoColumns,
} from "@/lib/photos";
import type { PostDoc, PostNode } from "@/lib/post-doc";
import { generateSlug } from "@/utils/markdown";
import type React from "react";

/**
 * A post, rendered from the ProseMirror document the editor saved.
 *
 * This is a plain walk over the tree rather than `generateHTML` plus
 * `dangerouslySetInnerHTML`, because the styling here is not decoration that
 * could live in a stylesheet: headings carry generated anchor ids, links
 * decide their own target and rel, `strong` reads a CSS variable, and photos
 * are a component. Serializing to an HTML string would mean writing all of
 * that a second time, in strings, and keeping the two in step.
 *
 * The class names are the ones the markdown renderer used, moved rather than
 * redesigned: the reading page is not what changed.
 */

const HEADING = [
	"mt-10 mb-4 scroll-mt-24 font-serif text-3xl text-foreground leading-snug",
	"mt-14 mb-5 scroll-mt-24 border-border border-t pt-8 font-serif text-2xl text-foreground leading-snug md:text-[1.75rem]",
	"mt-8 mb-3 font-semibold text-foreground text-xl",
	"mt-6 mb-2 font-semibold text-foreground text-lg",
	"mt-6 mb-2 font-semibold text-base text-foreground",
	"mt-6 mb-2 font-semibold text-foreground text-sm",
];

/** The words in a node, for a heading's anchor. */
function textOf(node: PostNode): string {
	if (typeof node.text === "string") return node.text;
	return (node.content ?? []).map(textOf).join("");
}

/**
 * Marks wrap inside out: the innermost mark is applied first, so folding from
 * the end of the list puts the outermost one outside.
 */
function withMarks(node: PostNode, children: React.ReactNode): React.ReactNode {
	const marks = (
		node as { marks?: Array<{ type: string; attrs?: Record<string, unknown> }> }
	).marks;
	if (!marks?.length) return children;

	return marks.reduceRight<React.ReactNode>((inner, mark) => {
		switch (mark.type) {
			case "bold":
				return (
					<strong
						className="font-semibold"
						style={{ color: "var(--semi-foreground)" }}
					>
						{inner}
					</strong>
				);
			case "italic":
				return <em>{inner}</em>;
			case "strike":
				return <s>{inner}</s>;
			case "underline":
				return <u>{inner}</u>;
			case "code":
				return (
					<code className="bg-foreground/5 px-1.5 py-0.5 font-mono text-[0.9em]">
						{inner}
					</code>
				);
			case "link": {
				const href = String(mark.attrs?.href ?? "");
				// Links out of a letter should open alongside it rather than
				// navigating the reader away. noreferrer keeps the unlisted URL
				// out of the destination's referrer logs.
				const external = /^https?:\/\//.test(href);
				return (
					<a
						href={href}
						className="link-static text-foreground underline"
						{...(external
							? { target: "_blank", rel: "noopener noreferrer" }
							: {})}
					>
						{inner}
					</a>
				);
			}
			default:
				return inner;
		}
	}, children);
}

function PhotoGrid({ photos }: { photos: unknown }) {
	const rows = parsePhotos(photos);
	if (rows.length === 0) return null;

	return (
		<div className={`my-8 grid gap-3 ${photoColumns(rows.length)}`}>
			{rows.map((photo) => (
				<img
					key={photo.src}
					src={optimized(photo.src, 1080)}
					// Only where the sizes are real. A static file under `public/`
					// cannot be resized, and three identical URLs under three width
					// descriptors would have the browser pick one at random and
					// believe whatever it was told about how big it is.
					{...(optimizable(photo.src)
						? {
								srcSet: `${optimized(photo.src, 640)} 640w, ${optimized(photo.src, 1080)} 1080w, ${optimized(photo.src, 1920)} 1920w`,
								sizes: "(max-width: 768px) 50vw, 360px",
							}
						: {})}
					alt={photo.alt}
					loading="lazy"
					className="aspect-[3/2] w-full rounded-md object-cover"
				/>
			))}
		</div>
	);
}

function children(node: PostNode): React.ReactNode {
	// A document node has no id; its position in its parent is its identity,
	// and the tree is re-rendered whole rather than reconciled in place.
	return (node.content ?? []).map((child, index) => (
		<Node key={`${child.type}-${index}`} node={child} />
	));
}

function Node({ node }: { node: PostNode }): React.ReactNode {
	switch (node.type) {
		case "text":
			return withMarks(node, node.text ?? "");

		case "paragraph":
			return (
				<p className="my-5 text-[1.0625rem] leading-[1.75]">{children(node)}</p>
			);

		case "heading": {
			const level = Math.min(6, Math.max(1, Number(node.attrs?.level ?? 1))) as
				| 1
				| 2
				| 3
				| 4
				| 5
				| 6;
			const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
			// Only h1 and h2 anchor, because only they are in the table of
			// contents. `generateSlug` is the markdown renderer's, unchanged, so
			// an anchor somebody already has still lands.
			return (
				<Tag
					id={level <= 2 ? generateSlug(textOf(node)) : undefined}
					className={HEADING[level - 1]}
				>
					{children(node)}
				</Tag>
			);
		}

		case "bulletList":
			return (
				<ul className="my-5 list-disc space-y-2 pl-5">{children(node)}</ul>
			);

		case "orderedList":
			return (
				<ol className="my-5 list-decimal space-y-2 pl-5">{children(node)}</ol>
			);

		case "listItem":
			return <li className="leading-[1.75]">{children(node)}</li>;

		case "blockquote":
			return (
				<blockquote className="my-8 border-border border-l-2 pl-6 font-serif text-2xl text-foreground leading-snug not-italic [&_p]:text-foreground">
					{children(node)}
				</blockquote>
			);

		case "codeBlock":
			return (
				<pre className="my-6 overflow-x-auto border border-border bg-card p-4 font-mono text-[13px]">
					<code>{children(node)}</code>
				</pre>
			);

		case "horizontalRule":
			return <hr className="my-8 border-foreground/20" />;

		case "hardBreak":
			return <br />;

		case "photos":
			return <PhotoGrid photos={node.attrs?.photos} />;

		// A node type this renderer has not met yet. Its words still belong to
		// the reader, so they are rendered; its layout is not invented.
		default:
			return children(node);
	}
}

export function PostBody({ doc }: { doc: unknown }) {
	const root = (doc ?? { type: "doc", content: [] }) as PostDoc;
	return (
		<div className="text-muted-foreground [&>:first-child]:mt-0">
			{children(root as PostNode)}
		</div>
	);
}

/** The h1s and h2s, for the table of contents. Same ids the headings render. */
export function headingsOf(doc: unknown): Array<{
	id: string;
	text: string;
	level: number;
}> {
	const root = (doc ?? { type: "doc", content: [] }) as PostNode;
	const out: Array<{ id: string; text: string; level: number }> = [];

	const walk = (node: PostNode) => {
		if (node.type === "heading") {
			const level = Number(node.attrs?.level ?? 1);
			if (level <= 2) {
				const text = textOf(node);
				if (text) out.push({ id: generateSlug(text), text, level });
			}
		}
		for (const child of node.content ?? []) walk(child);
	};

	walk(root);
	return out;
}
