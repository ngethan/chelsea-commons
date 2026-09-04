import type { Block, Card } from "@/lib/markdown-blocks";
import { parseBlocks } from "@/lib/markdown-blocks";
import { partnerLogo } from "@/lib/partner-logos";
import { generateSlug, headingText } from "@/utils/markdown";
import { useMemo } from "react";
import { Streamdown } from "streamdown";

/** h1-h6 differ only by size and whether they anchor, so build them. */
function heading(level: 1 | 2 | 3 | 4 | 5 | 6, className: string) {
	const Tag = `h${level}` as const;
	const anchored = level <= 2;
	return ({ children }: { children?: React.ReactNode }) => (
		<Tag
			id={anchored ? generateSlug(headingText(children)) : undefined}
			className={className}
			data-streamdown={`heading-${level}`}
		>
			{children}
		</Tag>
	);
}

const streamdownComponents = {
	img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
		<img
			{...props}
			alt={props.alt || ""}
			className="my-6 max-w-full rounded-lg"
			data-streamdown="image"
		/>
	),
	hr: () => (
		<hr
			className="my-8 border-foreground/20"
			data-streamdown="horizontal-rule"
		/>
	),
	// Links out of a letter (the hackathon video on LinkedIn, for one) should
	// open alongside it rather than navigating the reader away. noreferrer
	// keeps the unlisted letter URL out of the destination's referrer logs.
	a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
		const external = /^https?:\/\//.test(href ?? "");
		return (
			<a
				href={href}
				{...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
			>
				{children}
			</a>
		);
	},
	strong: ({ children }: { children?: React.ReactNode }) => (
		<strong
			className="font-semibold"
			style={{ color: "var(--semi-foreground)" }}
		>
			{children}
		</strong>
	),
	blockquote: ({ children }: { children?: React.ReactNode }) => (
		<blockquote className="my-8 border-border border-l-2 pl-6 font-serif text-2xl text-foreground leading-snug not-italic md:text-[1.75rem] [&_p]:text-foreground">
			{children}
		</blockquote>
	),
	h1: heading(
		1,
		"mt-10 mb-4 scroll-mt-24 font-serif text-3xl text-foreground leading-snug",
	),
	h2: heading(
		2,
		"mt-14 mb-5 scroll-mt-24 border-border border-t pt-8 font-serif text-2xl text-foreground leading-snug md:text-[1.75rem]",
	),
	h3: heading(3, "mt-8 mb-3 font-semibold text-foreground text-xl"),
	h4: heading(4, "mt-6 mb-2 font-semibold text-foreground text-lg"),
	h5: heading(5, "mt-6 mb-2 font-semibold text-base text-foreground"),
	h6: heading(6, "mt-6 mb-2 font-semibold text-foreground text-sm"),
};

function Label({ children }: { children: React.ReactNode }) {
	return (
		<p className="mb-3 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
			{children}
		</p>
	);
}

function PartnerGrid({ names }: { names: string[] }) {
	if (names.length === 0) return null;
	return (
		<div className="my-8 grid grid-cols-3 gap-x-6 gap-y-7 rounded-lg border border-border bg-card px-6 py-8 sm:grid-cols-4">
			{names.map((name) => {
				const logo = partnerLogo(name);
				return (
					<div key={name} className="group flex items-center justify-center">
						{logo ? (
							<img
								src={logo}
								alt={name}
								loading="lazy"
								className="max-h-6 w-auto max-w-full object-contain opacity-70 grayscale transition duration-200 group-hover:opacity-100 group-hover:grayscale-0"
							/>
						) : (
							<span className="text-center text-muted-foreground text-xs">
								{name}
							</span>
						)}
					</div>
				);
			})}
		</div>
	);
}

function MoonshotGrid({ items }: { items: string[] }) {
	if (items.length === 0) return null;
	return (
		<ol className="my-8 grid gap-x-6 gap-y-3 sm:grid-cols-2">
			{items.map((item, i) => (
				<li
					key={item}
					className="flex gap-3 text-[0.9375rem] text-muted-foreground leading-relaxed"
				>
					<span className="pt-[0.3em] font-mono text-ring text-xs">
						{String(i + 1).padStart(2, "0")}
					</span>
					<span>{item}</span>
				</li>
			))}
		</ol>
	);
}

function CardGrid({ cards }: { cards: Card[] }) {
	if (cards.length === 0) return null;
	return (
		<div className="my-8 grid gap-4 sm:grid-cols-2">
			{cards.map((card) => (
				<div
					key={card.title}
					className="rounded-lg border border-border bg-card p-6"
				>
					<Label>{card.title}</Label>
					<p className="text-muted-foreground text-sm leading-relaxed">
						{card.body}
					</p>
				</div>
			))}
		</div>
	);
}

function PhotoGrid({
	photos,
}: { photos: Array<{ src: string; alt: string }> }) {
	if (photos.length === 0) {
		// An empty block means the author left a slot for photos they have not
		// added yet. Say so while developing; show nothing to a reader.
		if (!import.meta.env.DEV) return null;
		return (
			<div className="my-8 rounded-lg border border-ring/60 border-dashed px-5 py-8 text-center font-mono text-muted-foreground text-xs">
				Dev only: this <code>photos</code> block is empty.
			</div>
		);
	}
	// One photo reads as a figure and gets the full column; a set reads as a
	// contact sheet. Cropping to 3:2 rather than a portrait ratio keeps a
	// landscape snapshot from losing half its frame.
	const columns =
		photos.length === 1
			? "grid-cols-1"
			: // Two columns for two or four, so a set of four is a square rather
				// than a row of three with one stranded underneath.
				photos.length === 2 || photos.length === 4
				? "grid-cols-2"
				: "grid-cols-2 md:grid-cols-3";

	return (
		<div className={`my-8 grid gap-3 ${columns}`}>
			{photos.map((photo) => (
				<img
					key={photo.src}
					src={photo.src}
					alt={photo.alt}
					loading="lazy"
					className="aspect-[3/2] w-full rounded-md object-cover"
				/>
			))}
		</div>
	);
}

function renderBlock(block: Block, index: number) {
	switch (block.kind) {
		case "markdown":
			return (
				<Streamdown key={index} components={streamdownComponents}>
					{block.text}
				</Streamdown>
			);
		case "partners":
			return <PartnerGrid key={index} names={block.names} />;
		case "moonshots":
			return <MoonshotGrid key={index} items={block.items} />;
		case "cards":
			return <CardGrid key={index} cards={block.cards} />;
		case "photos":
			return <PhotoGrid key={index} photos={block.photos} />;
	}
}

/**
 * Renders a markdown document, splitting the custom fenced blocks
 * (`partners`, `moonshots`, `cards`, `photos`) out of the prose so they can be
 * laid out as components. Shared by blog posts and investor updates.
 */
export function MarkdownContent({ markdown }: { markdown: string }) {
	const blocks = useMemo(() => parseBlocks(markdown), [markdown]);

	return (
		<div className="prose prose-neutral max-w-none prose-headings:text-foreground prose-li:text-muted-foreground prose-p:text-muted-foreground prose-p:leading-relaxed prose-strong:text-foreground">
			{blocks.map(renderBlock)}
		</div>
	);
}
