import { isValidElement } from "react";
import type { ReactNode } from "react";

export interface Heading {
	id: string;
	text: string;
	level: number;
}

export function generateSlug(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");
}

export function extractHeadings(markdown: string): Heading[] {
	const headings: Heading[] = [];
	const lines = markdown.split("\n");

	for (const line of lines) {
		const match = line.match(/^(#{1,2})\s+(.+)$/);
		if (match) {
			const level = match[1].length;
			const text = match[2].trim();
			const id = generateSlug(text);
			headings.push({ id, text, level });
		}
	}

	return headings;
}

/**
 * Markdown headings arrive from the renderer as an array of nodes (text plus
 * any inline `code` or emphasis), not a bare string, so reading `children`
 * directly yields "" for anything but the simplest heading. The table of
 * contents derives its anchors from the markdown source with generateSlug, so
 * an empty id on the rendered heading silently breaks every TOC link.
 */
export function headingText(children: ReactNode): string {
	if (typeof children === "string" || typeof children === "number") {
		return String(children);
	}
	if (Array.isArray(children)) return children.map(headingText).join("");
	if (isValidElement<{ children?: ReactNode }>(children)) {
		return headingText(children.props.children);
	}
	return "";
}
