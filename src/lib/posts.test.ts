import { describe, expect, it } from "vitest";
import { parsePost, postTimestamp } from "./posts";

const withFrontmatter = (lines: string[]) =>
	["---", ...lines, "---", "", "Body text."].join("\n");

describe("parsePost", () => {
	it("reads the documented frontmatter", () => {
		const post = parsePost(
			"a-post",
			withFrontmatter([
				"name: A Post",
				"description: What it is about.",
				"visibility: public",
				"date: Sep 2026",
			]),
		);
		expect(post).toMatchObject({
			slug: "a-post",
			name: "A Post",
			description: "What it is about.",
			visibility: "public",
			date: "Sep 2026",
			content: "Body text.",
		});
	});

	it("publishes only on the exact string public", () => {
		const visibility = (value: string) =>
			parsePost("p", withFrontmatter([`visibility: ${value}`])).visibility;

		expect(visibility("public")).toBe("public");
		expect(visibility("private")).toBe("private");
		expect(visibility("Public")).toBe("private");
		expect(visibility("publik")).toBe("private");
		expect(visibility("true")).toBe("private");
	});

	it("stays private when visibility is missing entirely", () => {
		expect(parsePost("p", withFrontmatter(["name: X"])).visibility).toBe(
			"private",
		);
		expect(parsePost("p", "No frontmatter at all.").visibility).toBe("private");
	});

	it("falls back to the slug when name is missing", () => {
		expect(parsePost("my-slug", "Body.").name).toBe("my-slug");
	});

	it("keeps the optional fields when present and undefined when not", () => {
		const full = parsePost(
			"p",
			withFrontmatter([
				"subtitle: A label",
				"tags: [one, two]",
				"readTime: 4 min",
			]),
		);
		expect(full.subtitle).toBe("A label");
		expect(full.tags).toEqual(["one", "two"]);
		expect(full.readTime).toBe("4 min");

		const bare = parsePost("p", withFrontmatter(["name: X"]));
		expect(bare.subtitle).toBeUndefined();
		expect(bare.tags).toBeUndefined();
		expect(bare.readTime).toBeUndefined();
	});
});

describe("postTimestamp", () => {
	it("orders a bare month and a full date against each other", () => {
		const sep = postTimestamp("Sep 2026");
		const sep3 = postTimestamp("Sep 3, 2026");
		const oct = postTimestamp("Oct 2026");
		expect(sep3).toBeGreaterThan(sep);
		expect(oct).toBeGreaterThan(sep3);
	});

	it("sorts an unparseable date last instead of breaking the comparison", () => {
		// Date.parse("1 whenever") is a valid date in V8, so these must not be
		// delegated to it.
		expect(postTimestamp("whenever")).toBe(Number.NEGATIVE_INFINITY);
		expect(postTimestamp("Smarch 2026")).toBe(Number.NEGATIVE_INFINITY);
		expect(postTimestamp("2026")).toBe(Number.NEGATIVE_INFINITY);
		expect(postTimestamp("")).toBe(Number.NEGATIVE_INFINITY);
	});

	it("reads the month with or without a day, and a long month name", () => {
		expect(postTimestamp("Sep 2026")).toBe(Date.UTC(2026, 8, 1));
		expect(postTimestamp("Sep 3, 2026")).toBe(Date.UTC(2026, 8, 3));
		expect(postTimestamp("September 3 2026")).toBe(Date.UTC(2026, 8, 3));
	});
});
