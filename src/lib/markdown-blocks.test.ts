import { describe, expect, it } from "vitest";
import { parseBlocks } from "./markdown-blocks";

describe("parseBlocks", () => {
	it("returns a single run for plain markdown", () => {
		expect(parseBlocks("# Title\n\nSome prose.")).toEqual([
			{ kind: "markdown", text: "# Title\n\nSome prose." },
		]);
	});

	it("splits a custom fence out of the surrounding prose", () => {
		expect(
			parseBlocks("Before.\n\n```partners\na16z\nRamp\n```\n\nAfter."),
		).toEqual([
			{ kind: "markdown", text: "Before." },
			{ kind: "partners", names: ["a16z", "Ramp"] },
			{ kind: "markdown", text: "After." },
		]);
	});

	it("leaves an ordinary code block inside the markdown run", () => {
		const src = "Intro.\n\n```ts\nconst a = 1;\n```\n\nOutro.";
		expect(parseBlocks(src)).toEqual([{ kind: "markdown", text: src }]);
	});

	it("ignores a custom fence name nested inside a real code block", () => {
		const src = "````md\n```partners\na16z\n```\n````";
		expect(parseBlocks(src)).toEqual([{ kind: "markdown", text: src }]);
	});

	it("reads cards as title, body, separated by ---", () => {
		expect(
			parseBlocks(
				"```cards\nPartnerships\nWe partner with VCs.\nAnd companies.\n---\nEvents\nDinners and hackathons.\n```",
			),
		).toEqual([
			{
				kind: "cards",
				cards: [
					{
						title: "Partnerships",
						body: "We partner with VCs. And companies.",
					},
					{ title: "Events", body: "Dinners and hackathons." },
				],
			},
		]);
	});

	it("reads photos with an optional alt after the pipe", () => {
		expect(parseBlocks("```photos\n/a.webp | The crew\n/b.webp\n```")).toEqual([
			{
				kind: "photos",
				photos: [
					{ src: "/a.webp", alt: "The crew" },
					{ src: "/b.webp", alt: "" },
				],
			},
		]);
	});

	it("keeps the source text when a fence is never closed", () => {
		const blocks = parseBlocks("Intro.\n\n```partners\na16z");
		expect(blocks).toHaveLength(1);
		expect(blocks[0]).toMatchObject({ kind: "markdown" });
		expect((blocks[0] as { text: string }).text).toContain("a16z");
	});

	it("drops an empty custom block to an empty list rather than failing", () => {
		expect(parseBlocks("```photos\n```")).toEqual([
			{ kind: "photos", photos: [] },
		]);
	});
});
