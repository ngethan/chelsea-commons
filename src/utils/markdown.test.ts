import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { extractHeadings, generateSlug, headingText } from "./markdown";

describe("headingText", () => {
	it("reads a plain string heading", () => {
		expect(headingText("What we've done")).toBe("What we've done");
	});

	it("flattens the node array the markdown renderer actually passes", () => {
		expect(headingText(["What ", "we've ", "done"])).toBe("What we've done");
	});

	it("reaches through inline elements like code and emphasis", () => {
		expect(
			headingText(["We ", createElement("em", null, "really"), " did"]),
		).toBe("We really did");
	});

	it("is empty for nodes carrying no text", () => {
		expect(headingText(null)).toBe("");
		expect(headingText(undefined)).toBe("");
	});

	it("produces the same anchor the table of contents links to", () => {
		const markdown = "## What we've done\n\nbody";
		const [fromSource] = extractHeadings(markdown);
		const rendered = generateSlug(headingText(["What ", "we've done"]));
		expect(rendered).toBe(fromSource.id);
	});
});
