import { describe, expect, it } from "vitest";
import { parseRecipients } from "./recipients";

describe("parseRecipients", () => {
	it("reads a bare address", () => {
		expect(parseRecipients("jane@example.com")).toEqual({
			recipients: [{ email: "jane@example.com", name: null }],
			invalid: [],
		});
	});

	it("reads the angle-bracket form", () => {
		expect(parseRecipients("Jane Doe <jane@example.com>").recipients).toEqual([
			{ email: "jane@example.com", name: "Jane Doe" },
		]);
	});

	it("reads a quoted name", () => {
		expect(parseRecipients('"Jane Doe" <jane@example.com>').recipients).toEqual(
			[{ email: "jane@example.com", name: "Jane Doe" }],
		);
	});

	it("reads the comma form in either order", () => {
		expect(parseRecipients("Jane Doe, jane@example.com").recipients).toEqual([
			{ email: "jane@example.com", name: "Jane Doe" },
		]);
		expect(parseRecipients("jane@example.com, Jane Doe").recipients).toEqual([
			{ email: "jane@example.com", name: "Jane Doe" },
		]);
	});

	it("drops repeats of the same address, case insensitively", () => {
		const { recipients } = parseRecipients(
			"jane@example.com\nJane <JANE@example.com>\nbob@example.com",
		);
		expect(recipients.map((r) => r.email)).toEqual([
			"jane@example.com",
			"bob@example.com",
		]);
	});

	it("collects lines it cannot read instead of silently skipping them", () => {
		const { recipients, invalid } = parseRecipients(
			"jane@example.com\nnot an address\nbob@\n\n  \nbob@example.com",
		);
		expect(recipients.map((r) => r.email)).toEqual([
			"jane@example.com",
			"bob@example.com",
		]);
		expect(invalid).toEqual(["not an address", "bob@"]);
	});
});
