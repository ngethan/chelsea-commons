import { describe, expect, it } from "vitest";
import {
	MAX_OPERATIONS,
	fieldChanges,
	isDestructive,
	operationSchema,
	proposalInputSchema,
	summarizeCounts,
} from "./ai-operations";

describe("operationSchema", () => {
	it("normalises addresses the way the routers do", () => {
		const parsed = operationSchema.parse({
			op: "create_contact",
			email: "Jane@Example.COM",
		});
		expect(parsed).toMatchObject({ email: "jane@example.com" });
	});

	it("refuses an unknown kind", () => {
		expect(
			operationSchema.safeParse({ op: "drop_table", id: "x" }).success,
		).toBe(false);
	});

	it("refuses a status outside the pipeline", () => {
		expect(
			operationSchema.safeParse({
				op: "update_contact",
				id: "7b1d2f1a-6c2e-4a7f-9a2b-0f6c1d2e3f4a",
				status: "warm",
			}).success,
		).toBe(false);
	});

	it("takes an organization by id or by name, not by anything else", () => {
		const id = "7b1d2f1a-6c2e-4a7f-9a2b-0f6c1d2e3f4a";
		expect(
			operationSchema.safeParse({
				op: "create_contact",
				email: "a@b.co",
				organization: { id },
			}).success,
		).toBe(true);
		expect(
			operationSchema.safeParse({
				op: "create_contact",
				email: "a@b.co",
				organization: { name: "Acme" },
			}).success,
		).toBe(true);
		expect(
			operationSchema.safeParse({
				op: "create_contact",
				email: "a@b.co",
				organization: "Acme",
			}).success,
		).toBe(false);
	});

	it("caps a proposal", () => {
		const operations = Array.from({ length: MAX_OPERATIONS + 1 }, (_, i) => ({
			op: "create_contact",
			email: `p${i}@example.com`,
		}));
		expect(
			proposalInputSchema.safeParse({ summary: "Too many", operations })
				.success,
		).toBe(false);
	});
});

describe("isDestructive", () => {
	it("is every remove and revoke, and nothing else", () => {
		const id = "7b1d2f1a-6c2e-4a7f-9a2b-0f6c1d2e3f4a";
		expect(isDestructive({ op: "remove_contact", id })).toBe(true);
		expect(isDestructive({ op: "revoke_access", id })).toBe(true);
		expect(isDestructive({ op: "restore_access", id })).toBe(false);
		expect(isDestructive({ op: "update_contact", id, status: "passed" })).toBe(
			false,
		);
	});
});

describe("fieldChanges", () => {
	it("lists only the fields the operation names, and only those that move", () => {
		const changes = fieldChanges(
			{
				op: "update_contact",
				id: "7b1d2f1a-6c2e-4a7f-9a2b-0f6c1d2e3f4a",
				status: "committed",
				tags: ["advisor"],
			},
			{ status: "prospect", tags: ["advisor"], name: "Jane", notes: "x" },
		);
		expect(changes).toEqual([
			{ field: "status", from: "prospect", to: "committed" },
		]);
	});

	it("shows a clear as 'nothing'", () => {
		const changes = fieldChanges(
			{
				op: "update_contact",
				id: "7b1d2f1a-6c2e-4a7f-9a2b-0f6c1d2e3f4a",
				notes: null,
			},
			{ notes: "old" },
		);
		expect(changes).toEqual([{ field: "notes", from: "old", to: null }]);
	});

	it("names an organization reference by its name", () => {
		const changes = fieldChanges(
			{
				op: "create_contact",
				email: "a@b.co",
				organization: { name: "Acme" },
			},
			null,
		);
		expect(changes).toContainEqual({
			field: "organization",
			from: null,
			to: "Acme",
		});
	});
});

describe("summarizeCounts", () => {
	it("reads like a sentence fragment", () => {
		const id = "7b1d2f1a-6c2e-4a7f-9a2b-0f6c1d2e3f4a";
		expect(
			summarizeCounts([
				{ op: "create_contact", email: "a@b.co" },
				{ op: "create_contact", email: "c@d.co" },
				{ op: "update_contact", id, status: "passed" },
				{ op: "remove_contact", id },
			]),
		).toBe("2 added, 1 changed, 1 removed");
		expect(summarizeCounts([{ op: "invite", email: "e@f.co" }])).toBe(
			"1 added",
		);
	});
});

describe("people without an address", () => {
	const id = "7b1d2f1a-6c2e-4a7f-9a2b-0f6c1d2e3f4a";

	it("needs a name or an email, not both", () => {
		expect(operationSchema.safeParse({ op: "create_contact" }).success).toBe(
			false,
		);
		expect(
			operationSchema.safeParse({ op: "create_contact", name: "Ann" }).success,
		).toBe(true);
		expect(
			operationSchema.safeParse({ op: "create_contact", email: "ann@x.co" })
				.success,
		).toBe(true);
	});

	it("logs an interaction against a contact, dated as a day", () => {
		expect(
			operationSchema.parse({
				op: "log_interaction",
				contactId: id,
				summary: "Had a call.",
				topic: "Meeting",
				occurredAt: "2026-06-02",
			}),
		).toMatchObject({ op: "log_interaction", topic: "Meeting" });
		expect(
			operationSchema.safeParse({
				op: "log_interaction",
				contactId: id,
				summary: "Had a call.",
				occurredAt: "June 2",
			}).success,
		).toBe(false);
	});

	it("counts a logged interaction as something added", () => {
		expect(
			summarizeCounts([{ op: "log_interaction", contactId: id, summary: "x" }]),
		).toBe("1 added");
	});
});
