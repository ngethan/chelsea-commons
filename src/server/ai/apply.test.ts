import { TRPCError } from "@trpc/server";
import { describe, expect, it, vi } from "vitest";
import { applyOperations } from "./apply";
import type { ToolContext } from "./read-tools";

const ACME = "33333333-3333-4333-8333-333333333333";
const JANE = "11111111-1111-4111-8111-111111111111";

/** A caller that records what it was asked to do. */
function fakeCaller() {
	const created: string[] = [];
	const calls: string[] = [];
	const caller = {
		contacts: {
			create: vi.fn(
				async (input: { email: string; organizationId: string | null }) => {
					calls.push(`contacts.create ${input.email}`);
					if (input.email === "dupe@x.com")
						throw new TRPCError({
							code: "CONFLICT",
							message: "Somebody with that address is already on the list.",
						});
					return { id: `c-${input.email}`, name: null, email: input.email };
				},
			),
			update: vi.fn(async (input: Record<string, unknown>) => {
				calls.push(`contacts.update ${JSON.stringify(input)}`);
				return { id: input.id, name: "Jane", email: "jane@acme.com" };
			}),
			remove: vi.fn(async () => ({ deleted: true })),
		},
		organizations: {
			list: vi.fn(async () => [
				{ id: ACME, name: "Acme" },
				...created.map((name, i) => ({ id: `org-${i}`, name })),
			]),
			create: vi.fn(async ({ name }: { name: string }) => {
				created.push(name);
				calls.push(`organizations.create ${name}`);
				return { id: `org-${created.length - 1}`, name };
			}),
		},
	};
	return { caller, calls };
}

const context = (caller: unknown) =>
	({ ctx: {}, caller }) as unknown as ToolContext;

describe("applyOperations", () => {
	it("runs each operation through its procedure and reports per row", async () => {
		const { caller } = fakeCaller();
		const out = await applyOperations(
			[
				{ op: "create_contact", email: "new@x.com" },
				{ op: "create_contact", email: "dupe@x.com" },
				{ op: "update_contact", id: JANE, status: "committed" },
			],
			context(caller),
		);
		expect(out.applied).toBe(2);
		expect(out.failed).toBe(1);
		expect(out.results[1]).toMatchObject({
			index: 1,
			ok: false,
			message: expect.stringContaining("already on the list"),
		});
		expect(out.results[2]).toMatchObject({ ok: true, id: JANE });
	});

	it("matches an organization by name, case-insensitively, without creating it", async () => {
		const { caller } = fakeCaller();
		await applyOperations(
			[
				{
					op: "create_contact",
					email: "a@x.com",
					organization: { name: "acme" },
				},
			],
			context(caller),
		);
		expect(caller.organizations.create).not.toHaveBeenCalled();
		expect(caller.contacts.create).toHaveBeenCalledWith(
			expect.objectContaining({ organizationId: ACME }),
		);
	});

	it("creates an unknown organization once for the whole proposal", async () => {
		const { caller } = fakeCaller();
		await applyOperations(
			[
				{
					op: "create_contact",
					email: "a@x.com",
					organization: { name: "Initech" },
				},
				{
					op: "create_contact",
					email: "b@x.com",
					organization: { name: "initech" },
				},
				{ op: "update_contact", id: JANE, organization: { name: "Initech" } },
			],
			context(caller),
		);
		expect(caller.organizations.create).toHaveBeenCalledTimes(1);
		const ids = caller.contacts.create.mock.calls.map(
			([input]) => input.organizationId,
		);
		expect(new Set(ids).size).toBe(1);
		expect(caller.contacts.update).toHaveBeenCalledWith(
			expect.objectContaining({ id: JANE, organizationId: ids[0] }),
		);
	});

	it("only sends the fields an update names", async () => {
		const { caller } = fakeCaller();
		await applyOperations(
			[{ op: "update_contact", id: JANE, tags: ["lp"] }],
			context(caller),
		);
		expect(caller.contacts.update).toHaveBeenCalledWith({
			id: JANE,
			tags: ["lp"],
		});
	});

	it("clears an organization when told to", async () => {
		const { caller } = fakeCaller();
		await applyOperations(
			[{ op: "update_contact", id: JANE, organization: null }],
			context(caller),
		);
		expect(caller.contacts.update).toHaveBeenCalledWith({
			id: JANE,
			organizationId: null,
		});
	});

	it("keeps going after a failure and does not hide it", async () => {
		const { caller, calls } = fakeCaller();
		const out = await applyOperations(
			[
				{ op: "create_contact", email: "dupe@x.com" },
				{ op: "create_contact", email: "after@x.com" },
			],
			context(caller),
		);
		expect(calls).toEqual([
			"contacts.create dupe@x.com",
			"contacts.create after@x.com",
		]);
		expect(out.results.map((r) => r.ok)).toEqual([false, true]);
	});
});
