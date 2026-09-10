import { CONTACT_STATUSES } from "@/lib/status";
import { z } from "zod";

/**
 * Everything the assistant is allowed to change, as data.
 *
 * The model never writes. It calls one tool, `propose_changes`, whose input
 * is a list of these operations; the server validates them, shows them to
 * the person as a card, and nothing happens until that person presses Apply.
 * Applying runs each operation through the same tRPC procedure the buttons
 * in the admin use, so the duplicate checks, the activity log and the search
 * reindex all happen exactly as if it had been typed.
 *
 * This file is shared by the server (validation, execution) and the browser
 * (rendering the card), so it holds schemas and pure helpers only.
 */

const email = z.email("That is not an email address.").trim().toLowerCase();
const uuid = z.uuid();
const text = z.string().trim().max(4000);
const shortText = z.string().trim().max(200);

/**
 * An organization by id when the model has one, or by name when it does
 * not. A name is matched case-insensitively against the existing list on
 * apply, and created if nothing matches, so "put these people at Acme" is
 * one proposal rather than two.
 */
const organizationRef = z.union([
	z.object({ id: uuid }),
	z.object({ name: shortText.min(1) }),
]);

const contactFields = z.object({
	name: shortText.nullable().optional(),
	email: email.nullable().optional(),
	title: shortText
		.nullable()
		.optional()
		.describe("Their role, e.g. 'Principal' or 'Founder'. Not the company."),
	alternateEmails: z.array(email).max(20).optional(),
	phone: shortText.nullable().optional(),
	organization: organizationRef.nullable().optional(),
	status: z.enum(CONTACT_STATUSES).optional(),
	tags: z.array(shortText.min(1)).max(40).optional(),
	pocs: z
		.array(shortText.min(1))
		.max(10)
		.optional()
		.describe(
			"Who in the house holds the relationship, by first name. More than one is fine.",
		),
	notes: text.nullable().optional(),
});

const organizationFields = z.object({
	name: shortText.min(1).optional(),
	domain: shortText.nullable().optional(),
	notes: text.nullable().optional(),
});

export const operationSchema = z.discriminatedUnion("op", [
	z
		.object({
			op: z.literal("create_contact"),
			...contactFields.shape,
		})
		.refine((o) => Boolean(o.name || o.email), {
			message: "a contact needs a name or an email",
		}),
	z.object({
		op: z.literal("update_contact"),
		id: uuid,
		...contactFields.shape,
	}),
	z.object({ op: z.literal("remove_contact"), id: uuid }),
	z.object({
		op: z.literal("log_interaction"),
		contactId: uuid,
		summary: text
			.min(1)
			.describe("What happened, in a sentence or two, past tense."),
		topic: shortText
			.nullable()
			.optional()
			.describe(
				"A short category, e.g. 'Investor update outreach', 'Meeting'.",
			),
		occurredAt: z
			.string()
			.date()
			.optional()
			.describe("YYYY-MM-DD. Today when omitted."),
	}),
	z.object({
		op: z.literal("create_organization"),
		...organizationFields.extend({ name: shortText.min(1) }).shape,
	}),
	z.object({
		op: z.literal("update_organization"),
		id: uuid,
		...organizationFields.shape,
	}),
	z.object({ op: z.literal("remove_organization"), id: uuid }),
	z.object({ op: z.literal("create_update"), slug: shortText.min(1) }),
	z.object({ op: z.literal("remove_update"), id: uuid }),
	z.object({
		op: z.literal("create_links"),
		updateId: uuid,
		contactIds: z.array(uuid).min(1).max(500),
	}),
	z.object({ op: z.literal("revoke_link"), id: uuid }),
	z.object({ op: z.literal("invite"), email }),
	z.object({ op: z.literal("revoke_access"), id: uuid }),
	z.object({ op: z.literal("restore_access"), id: uuid }),
]);

export type Operation = z.infer<typeof operationSchema>;
export type OperationKind = Operation["op"];

/** The upper bound on one proposal. Past this, the card stops being readable. */
export const MAX_OPERATIONS = 200;

export const proposalInputSchema = z.object({
	summary: z
		.string()
		.trim()
		.min(1)
		.max(200)
		.describe(
			"One plain sentence saying what this does, e.g. 'Add 12 people from the paste and file them at Acme'. Shown as the card's title.",
		),
	operations: z.array(operationSchema).min(1).max(MAX_OPERATIONS),
});

export type ProposalInput = z.infer<typeof proposalInputSchema>;

/**
 * A row as it stands before the operation touches it, so the card can show
 * "status: Prospect → Committed" rather than only the new value. Attached by
 * the server when it validates a proposal; absent for creates.
 */
export type BeforeSnapshot = Record<string, unknown>;

export type EnrichedOperation = {
	operation: Operation;
	/** Something to call it in the card: a name, an email, an update title. */
	label: string;
	before: BeforeSnapshot | null;
	/**
	 * For an organization given by name: the existing one it matched, or null
	 * when applying will create it.
	 */
	organization?: { id: string; name: string } | null;
	/** Things worth knowing that are not errors, e.g. "already tagged". */
	warnings: string[];
};

export type Proposal = {
	/** The `tool_use` id the model made it with. One card per id. */
	id: string;
	summary: string;
	operations: EnrichedOperation[];
	/** Whether anything in it removes or revokes. Drives the second confirm. */
	destructive: boolean;
};

export type OperationResult = {
	index: number;
	ok: boolean;
	message: string;
	/** The id of what was made, when something was. */
	id?: string;
};

export type ApplyResult = {
	results: OperationResult[];
	applied: number;
	failed: number;
};

export const DESTRUCTIVE_KINDS: ReadonlySet<OperationKind> = new Set([
	"remove_contact",
	"remove_organization",
	"remove_update",
	"revoke_link",
	"revoke_access",
]);

export function isDestructive(operation: Operation) {
	return DESTRUCTIVE_KINDS.has(operation.op);
}

/** What the card says in its badge. Verb first, then the noun. */
export const OPERATION_LABEL: Record<OperationKind, string> = {
	create_contact: "Add contact",
	update_contact: "Update contact",
	remove_contact: "Remove contact",
	log_interaction: "Log interaction",
	create_organization: "Add organization",
	update_organization: "Update organization",
	remove_organization: "Remove organization",
	create_update: "Create update",
	remove_update: "Delete update",
	create_links: "Mint links",
	revoke_link: "Revoke link",
	invite: "Invite",
	revoke_access: "Revoke access",
	restore_access: "Restore access",
};

/**
 * Field-by-field: what the operation sets, beside what was there. Only the
 * fields the operation names, so a status change is one line and not eight.
 */
export function fieldChanges(
	operation: Operation,
	before: BeforeSnapshot | null,
): Array<{ field: string; from: string | null; to: string | null }> {
	const skip = new Set(["op", "id", "updateId", "contactIds", "contactId"]);
	const changes: Array<{
		field: string;
		from: string | null;
		to: string | null;
	}> = [];

	for (const [field, value] of Object.entries(operation)) {
		if (skip.has(field) || value === undefined) continue;
		const to = display(value);
		const from = before ? display(before[field]) : null;
		if (before && from === to) continue;
		changes.push({ field, from, to });
	}

	return changes;
}

function display(value: unknown): string | null {
	if (value === null || value === undefined) return null;
	if (Array.isArray(value)) return value.length ? value.join(", ") : null;
	if (typeof value === "object") {
		const ref = value as { id?: string; name?: string };
		return ref.name ?? ref.id ?? null;
	}
	return String(value);
}

/** Counts for the card header: "3 added, 1 changed, 2 removed". */
export function summarizeCounts(operations: Operation[]) {
	let created = 0;
	let changed = 0;
	let removed = 0;
	for (const operation of operations) {
		if (isDestructive(operation)) removed += 1;
		else if (
			operation.op.startsWith("create_") ||
			operation.op === "invite" ||
			operation.op === "log_interaction"
		)
			created += 1;
		else changed += 1;
	}
	const parts: string[] = [];
	if (created) parts.push(`${created} added`);
	if (changed) parts.push(`${changed} changed`);
	if (removed) parts.push(`${removed} removed`);
	return parts.join(", ");
}
