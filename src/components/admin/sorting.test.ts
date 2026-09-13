import { describe, expect, it } from "vitest";
import { encodeSort, nextSort, parseSort, sortRows } from "./sorting";

describe("sort param", () => {
	it("round-trips", () => {
		expect(parseSort(encodeSort({ key: "lastTouch", dir: "desc" }))).toEqual({
			key: "lastTouch",
			dir: "desc",
		});
		expect(encodeSort(null)).toBeUndefined();
	});

	it("ignores what it cannot read", () => {
		expect(parseSort(undefined)).toBeNull();
		expect(parseSort("lastTouch")).toBeNull();
		expect(parseSort("lastTouch:sideways")).toBeNull();
		expect(parseSort(":desc")).toBeNull();
	});

	it("cycles most first, then least, then off", () => {
		const first = nextSort(null, "people");
		expect(first).toEqual({ key: "people", dir: "desc" });
		const second = nextSort(first, "people");
		expect(second).toEqual({ key: "people", dir: "asc" });
		expect(nextSort(second, "people")).toBeNull();
		// Another column starts its own cycle rather than continuing this one.
		expect(nextSort(second, "added")).toEqual({ key: "added", dir: "desc" });
	});
});

describe("sortRows", () => {
	const rows = [
		{ id: "a", n: 3, when: "2026-09-01T00:00:00Z" },
		{ id: "b", n: null, when: null },
		{ id: "c", n: 10, when: "2026-09-12T00:00:00Z" },
		{ id: "d", n: 3, when: "2026-08-01T00:00:00Z" },
	];
	const by = {
		n: (r: (typeof rows)[number]) => r.n,
		when: (r: (typeof rows)[number]) => r.when,
	};
	const ids = (list: typeof rows) => list.map((r) => r.id);

	it("leaves the list alone with no sort or an unknown key", () => {
		expect(sortRows(rows, null, by)).toBe(rows);
		expect(sortRows(rows, { key: "nope", dir: "asc" }, by)).toBe(rows);
	});

	it("orders numbers, ties by original order, empties last", () => {
		expect(ids(sortRows(rows, { key: "n", dir: "desc" }, by))).toEqual([
			"c",
			"a",
			"d",
			"b",
		]);
		expect(ids(sortRows(rows, { key: "n", dir: "asc" }, by))).toEqual([
			"a",
			"d",
			"c",
			"b",
		]);
	});

	it("orders date strings as dates, empties last either way", () => {
		expect(ids(sortRows(rows, { key: "when", dir: "desc" }, by))).toEqual([
			"c",
			"a",
			"d",
			"b",
		]);
		expect(ids(sortRows(rows, { key: "when", dir: "asc" }, by))).toEqual([
			"d",
			"a",
			"c",
			"b",
		]);
	});

	it("orders Date objects", () => {
		const dated = [
			{ id: "x", d: new Date("2026-01-02") },
			{ id: "y", d: new Date("2026-01-01") },
		];
		expect(
			sortRows(dated, { key: "d", dir: "asc" }, { d: (r) => r.d }).map(
				(r) => r.id,
			),
		).toEqual(["y", "x"]);
	});
});
