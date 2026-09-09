import { describe, expect, it } from "vitest";
import { validateProposal } from "./proposal";
import type { ToolContext } from "./read-tools";

/**
 * A list of three people, two organizations, one update, one roster entry,
 * standing in for the database. The validator only reads, and only through
 * the caller plus one direct query for alternate addresses, so this is the
 * whole surface it needs.
 */
const IDS = {
	jane: "11111111-1111-4111-8111-111111111111",
	sam: "22222222-2222-4222-8222-222222222222",
	acme: "33333333-3333-4333-8333-333333333333",
	globex: "44444444-4444-4444-8444-444444444444",
	letter: "55555555-5555-4555-8555-555555555555",
	me: "66666666-6666-4666-8666-666666666666",
	them: "77777777-7777-4777-8777-777777777777",
	nobody: "99999999-9999-4999-8999-999999999999",
};

const contacts = [
	{
		id: IDS.jane,
		name: "Jane Doe",
		email: "jane@acme.com",
		phone: null,
		status: "prospect",
		tags: ["advisor"],
		createdAt: new Date(),
		organizationId: IDS.acme,
		organizationName: "Acme",
	},
	{
		id: IDS.sam,
		name: null,
		email: "sam@globex.com",
		phone: null,
		status: "committed",
		tags: [],
		createdAt: new Date(),
		organizationId: null,
		organizationName: null,
	},
];

function fakeContext(
	overrides: {
		alternates?: Array<{ id: string; alternateEmails: string[] }>;
	} = {},
) {
	const rows = overrides.alternates ?? [];
	const chain = {
		from: () => chain,
		where: () => chain,
		innerJoin: () => chain,
		limit: () => chain,
		// biome-ignore lint/suspicious/noThenProperty: drizzle's query builder is a thenable, and the validator awaits it directly; the fake has to be one too.
		then: (
			resolve: (v: unknown) => unknown,
			reject?: (e: unknown) => unknown,
		) => Promise.resolve(rows).then(resolve, reject),
	};
	const caller = {
		contacts: {
			list: async () => contacts,
			byId: async ({ id }: { id: string }) => ({
				contact: {
					...contacts.find((c) => c.id === id),
					notes: "met at the house",
					alternateEmails: [],
				},
				organization: null,
			}),
		},
		organizations: {
			list: async () => [
				{
					id: IDS.acme,
					name: "Acme",
					domain: "acme.com",
					notes: null,
					contacts: 1,
				},
				{
					id: IDS.globex,
					name: "Globex",
					domain: null,
					notes: null,
					contacts: 0,
				},
			],
		},
		updates: {
			list: async () => [
				{
					id: IDS.letter,
					slug: "summer",
					title: "Summer letter",
					recipients: 1,
					opened: 0,
				},
			],
			availablePosts: async () => [
				{
					slug: "summer",
					name: "Summer letter",
					used: true,
					visibility: "public",
				},
				{
					slug: "fall",
					name: "Fall letter",
					used: false,
					visibility: "private",
				},
			],
			byId: async () => ({
				update: { id: IDS.letter },
				recipients: [{ contactId: IDS.jane }],
			}),
		},
		access: {
			list: async () => [
				{
					id: IDS.me,
					email: "me@example.com",
					revokedAt: null,
					isYou: true,
					signedInAt: new Date(),
				},
				{
					id: IDS.them,
					email: "them@example.com",
					revokedAt: new Date(),
					isYou: false,
					signedInAt: null,
				},
			],
		},
	};
	return {
		ctx: {
			db: { select: () => chain },
			user: { id: "u", email: "me@example.com" },
		},
		caller,
	} as unknown as ToolContext;
}

const propose = (operations: unknown[], tc = fakeContext()) =>
	validateProposal("toolu_1", { summary: "Test", operations }, tc);

describe("validateProposal", () => {
	it("rejects input that is not a proposal, naming the field", async () => {
		const out = await validateProposal(
			"t",
			{ summary: "", operations: [] },
			fakeContext(),
		);
		expect(out.ok).toBe(false);
		if (!out.ok) expect(out.errors.join("\n")).toMatch(/summary|operations/);
	});

	it("refuses to add somebody already on the list, pointing at them", async () => {
		const out = await propose([
			{ op: "create_contact", email: "JANE@acme.com" },
		]);
		expect(out.ok).toBe(false);
		if (!out.ok) expect(out.errors[0]).toContain(IDS.jane);
	});

	it("recognises an old address as the same person", async () => {
		const out = await propose(
			[{ op: "create_contact", email: "jane@oldjob.com" }],
			fakeContext({
				alternates: [{ id: IDS.jane, alternateEmails: ["jane@oldjob.com"] }],
			}),
		);
		expect(out.ok).toBe(false);
	});

	it("catches the same address twice in one proposal", async () => {
		const out = await propose([
			{ op: "create_contact", email: "new@x.com" },
			{ op: "create_contact", email: "New@x.com" },
		]);
		expect(out.ok).toBe(false);
		if (!out.ok) expect(out.errors[0]).toMatch(/twice/);
	});

	it("snapshots what a contact looks like before an update", async () => {
		const out = await propose([
			{ op: "update_contact", id: IDS.jane, status: "committed" },
		]);
		expect(out.ok).toBe(true);
		if (out.ok) {
			expect(out.proposal.operations[0].label).toBe("Jane Doe");
			expect(out.proposal.operations[0].before).toMatchObject({
				status: "prospect",
				organization: "Acme",
				notes: "met at the house",
			});
			expect(out.proposal.destructive).toBe(false);
		}
	});

	it("resolves an organization by name, and says when it would be new", async () => {
		const out = await propose([
			{
				op: "create_contact",
				email: "a@x.com",
				organization: { name: "acme" },
			},
			{
				op: "create_contact",
				email: "b@x.com",
				organization: { name: "Initech" },
			},
		]);
		expect(out.ok).toBe(true);
		if (out.ok) {
			expect(out.proposal.operations[0].organization).toEqual({
				id: IDS.acme,
				name: "Acme",
			});
			expect(out.proposal.operations[1].organization).toBeNull();
			expect(out.proposal.operations[1].warnings[0]).toMatch(
				/Creates the organization "Initech"/,
			);
		}
	});

	it("does not warn about an organization the same proposal creates", async () => {
		const out = await propose([
			{ op: "create_organization", name: "Initech" },
			{
				op: "create_contact",
				email: "b@x.com",
				organization: { name: "initech" },
			},
		]);
		expect(out.ok).toBe(true);
		if (out.ok) expect(out.proposal.operations[1].warnings).toEqual([]);
	});

	it("refuses an id that is nobody", async () => {
		const out = await propose([{ op: "remove_contact", id: IDS.nobody }]);
		expect(out.ok).toBe(false);
		if (!out.ok) expect(out.errors[0]).toMatch(/no live contact/);
	});

	it("marks a proposal with a removal as destructive", async () => {
		const out = await propose([
			{ op: "update_contact", id: IDS.sam, tags: ["lp"] },
			{ op: "remove_contact", id: IDS.jane },
		]);
		expect(out.ok).toBe(true);
		if (out.ok) expect(out.proposal.destructive).toBe(true);
	});

	it("will not delete an update that has links out", async () => {
		const out = await propose([{ op: "remove_update", id: IDS.letter }]);
		expect(out.ok).toBe(false);
		if (!out.ok) expect(out.errors[0]).toMatch(/links out/);
	});

	it("only makes an update from a post that is not one yet", async () => {
		expect((await propose([{ op: "create_update", slug: "summer" }])).ok).toBe(
			false,
		);
		const out = await propose([{ op: "create_update", slug: "fall" }]);
		expect(out.ok).toBe(true);
		if (out.ok)
			expect(out.proposal.operations[0].warnings[0]).toMatch(/not public/);
	});

	it("notes who already has a link when minting more", async () => {
		const out = await propose([
			{
				op: "create_links",
				updateId: IDS.letter,
				contactIds: [IDS.jane, IDS.sam],
			},
		]);
		expect(out.ok).toBe(true);
		if (out.ok)
			expect(out.proposal.operations[0].warnings[0]).toMatch(
				/1 of them already/,
			);
	});

	it("will not revoke your own access", async () => {
		const out = await propose([{ op: "revoke_access", id: IDS.me }]);
		expect(out.ok).toBe(false);
		if (!out.ok) expect(out.errors[0]).toMatch(/your own account/);
	});

	it("restores only what is revoked", async () => {
		expect((await propose([{ op: "restore_access", id: IDS.me }])).ok).toBe(
			false,
		);
		expect((await propose([{ op: "restore_access", id: IDS.them }])).ok).toBe(
			true,
		);
	});

	it("reports every problem at once, numbered", async () => {
		const out = await propose([
			{ op: "remove_contact", id: IDS.nobody },
			{ op: "create_contact", email: "jane@acme.com" },
		]);
		expect(out.ok).toBe(false);
		if (!out.ok) {
			expect(out.errors).toHaveLength(2);
			expect(out.errors[0]).toMatch(/^operation 1/);
			expect(out.errors[1]).toMatch(/^operation 2/);
		}
	});
});
