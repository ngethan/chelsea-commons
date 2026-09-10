import { contact, link, update } from "@/db/schema";
import {
	type EnrichedOperation,
	type Operation,
	type Proposal,
	isDestructive,
	proposalInputSchema,
} from "@/lib/ai-operations";
import { eq, isNull } from "drizzle-orm";
import type { ToolContext } from "./read-tools";

/**
 * Turns the model's `propose_changes` input into a card, or into a list of
 * reasons it cannot be one.
 *
 * Two jobs, on purpose in one pass. First, catch what would fail on apply
 * (an id that is nobody, an address already on the list, an update that
 * still has links out) and send it back to the model as an error, so the
 * person is never shown a card whose Apply button cannot work. Second,
 * fetch what each row looks like now, so the card can show the change as a
 * change, "Prospect → Committed", rather than as a bare new value.
 *
 * Nothing here writes.
 */

export type ValidationOutcome =
	| { ok: true; proposal: Proposal }
	| { ok: false; errors: string[] };

class Lookups {
	constructor(private tc: ToolContext) {}

	private contactsPromise?: ReturnType<
		ToolContext["caller"]["contacts"]["list"]
	>;
	contacts() {
		this.contactsPromise ??= this.tc.caller.contacts.list();
		return this.contactsPromise;
	}

	private alternatesPromise?: Promise<Map<string, string>>;
	/** Old addresses → the contact that owns them, lower-cased. */
	alternates() {
		this.alternatesPromise ??= this.tc.ctx.db
			.select({ id: contact.id, alternateEmails: contact.alternateEmails })
			.from(contact)
			.where(isNull(contact.deletedAt))
			.then((rows) => {
				const map = new Map<string, string>();
				for (const row of rows)
					for (const alt of row.alternateEmails)
						map.set(alt.toLowerCase(), row.id);
				return map;
			});
		return this.alternatesPromise;
	}

	async contactByEmail(email: string) {
		const needle = email.toLowerCase();
		const rows = await this.contacts();
		const direct = rows.find((r) => r.email?.toLowerCase() === needle);
		if (direct) return direct;
		const viaAlternate = (await this.alternates()).get(needle);
		return viaAlternate ? rows.find((r) => r.id === viaAlternate) : undefined;
	}

	private organizationsPromise?: ReturnType<
		ToolContext["caller"]["organizations"]["list"]
	>;
	organizations() {
		this.organizationsPromise ??= this.tc.caller.organizations.list();
		return this.organizationsPromise;
	}

	async organizationByName(name: string) {
		const needle = name.trim().toLowerCase();
		return (await this.organizations()).find(
			(o) => o.name.toLowerCase() === needle,
		);
	}

	private updatesPromise?: ReturnType<ToolContext["caller"]["updates"]["list"]>;
	updates() {
		this.updatesPromise ??= this.tc.caller.updates.list();
		return this.updatesPromise;
	}

	private postsPromise?: ReturnType<
		ToolContext["caller"]["updates"]["availablePosts"]
	>;
	posts() {
		this.postsPromise ??= this.tc.caller.updates.availablePosts();
		return this.postsPromise;
	}

	private rosterPromise?: ReturnType<ToolContext["caller"]["access"]["list"]>;
	roster() {
		this.rosterPromise ??= this.tc.caller.access.list();
		return this.rosterPromise;
	}
}

export async function validateProposal(
	id: string,
	rawInput: unknown,
	tc: ToolContext,
): Promise<ValidationOutcome> {
	const parsed = proposalInputSchema.safeParse(rawInput);
	if (!parsed.success) {
		return {
			ok: false,
			errors: parsed.error.issues.map(
				(issue) => `${issue.path.join(".") || "input"}: ${issue.message}`,
			),
		};
	}

	const lookups = new Lookups(tc);
	const errors: string[] = [];
	const operations: EnrichedOperation[] = [];
	/** Addresses and names this proposal itself introduces, to catch repeats. */
	const introducedEmails = new Set<string>();
	const introducedOrganizations = new Set<string>();

	for (const [index, operation] of parsed.data.operations.entries()) {
		const fail = (message: string) =>
			errors.push(`operation ${index + 1} (${operation.op}): ${message}`);
		try {
			const enriched = await enrich(operation, {
				lookups,
				tc,
				introducedEmails,
				introducedOrganizations,
			});
			if (typeof enriched === "string") fail(enriched);
			else operations.push(enriched);
		} catch (err) {
			fail(err instanceof Error ? err.message : String(err));
		}
	}

	if (errors.length) return { ok: false, errors };

	return {
		ok: true,
		proposal: {
			id,
			summary: parsed.data.summary,
			operations,
			destructive: operations.some((o) => isDestructive(o.operation)),
		},
	};
}

type EnrichContext = {
	lookups: Lookups;
	tc: ToolContext;
	introducedEmails: Set<string>;
	introducedOrganizations: Set<string>;
};

/**
 * Resolves an organization reference to what the card should say about it.
 * Returns a string on failure, like `enrich`.
 */
async function resolveOrganization(
	ref: { id: string } | { name: string } | null | undefined,
	{ lookups, introducedOrganizations }: EnrichContext,
): Promise<
	| { organization: { id: string; name: string } | null; warnings: string[] }
	| string
> {
	if (!ref) return { organization: null, warnings: [] };
	if ("id" in ref) {
		const found = (await lookups.organizations()).find((o) => o.id === ref.id);
		if (!found) return `no organization has the id ${ref.id}`;
		return { organization: { id: found.id, name: found.name }, warnings: [] };
	}
	const found = await lookups.organizationByName(ref.name);
	if (found)
		return { organization: { id: found.id, name: found.name }, warnings: [] };
	if (introducedOrganizations.has(ref.name.trim().toLowerCase()))
		return { organization: null, warnings: [] };
	return {
		organization: null,
		warnings: [`Creates the organization "${ref.name}"`],
	};
}

async function enrich(
	operation: Operation,
	ec: EnrichContext,
): Promise<EnrichedOperation | string> {
	const { lookups, tc } = ec;

	switch (operation.op) {
		case "create_contact": {
			const warnings: string[] = [];
			const email = operation.email?.toLowerCase() ?? null;
			if (email) {
				if (ec.introducedEmails.has(email))
					return `${email} appears twice in this proposal`;
				const existing = await lookups.contactByEmail(email);
				if (existing)
					return `${email} is already on the list (id ${existing.id}, ${existing.name ?? "no name"}); use update_contact if something about them should change`;
				ec.introducedEmails.add(email);
			} else {
				// No address to match on, so a name is the only guard against a
				// second row for one person. A warning, not a refusal: two people
				// can share a name, and the person applying can tell.
				const name = (operation.name ?? "").trim().toLowerCase();
				const twin = (await lookups.contacts()).find(
					(r) => r.name?.trim().toLowerCase() === name,
				);
				if (twin)
					warnings.push(
						`Somebody named ${twin.name} is already on the list (${twin.email ?? "no email"}); this adds a second`,
					);
			}
			const org = await resolveOrganization(operation.organization, ec);
			if (typeof org === "string") return org;
			warnings.push(...org.warnings);
			return {
				operation,
				label: operation.name || email || "Unnamed",
				before: null,
				organization: org.organization,
				warnings,
			};
		}

		case "log_interaction": {
			const row = (await lookups.contacts()).find(
				(r) => r.id === operation.contactId,
			);
			if (!row) return `no live contact has the id ${operation.contactId}`;
			return {
				operation,
				label: row.name || row.email || "Unnamed",
				before: null,
				warnings: [],
			};
		}

		case "update_contact": {
			const rows = await lookups.contacts();
			const row = rows.find((r) => r.id === operation.id);
			if (!row) return `no contact has the id ${operation.id}`;
			const warnings: string[] = [];
			if (operation.email) {
				const email = operation.email.toLowerCase();
				if (email !== row.email?.toLowerCase()) {
					const taken = await lookups.contactByEmail(email);
					if (taken && taken.id !== row.id)
						return `${email} already belongs to ${taken.name ?? taken.email} (id ${taken.id})`;
				}
			}
			if (
				(operation.name === null ||
					(operation.name === undefined && !row.name)) &&
				(operation.email === null ||
					(operation.email === undefined && !row.email))
			)
				return "a contact needs a name or an email";
			if (operation.tags) {
				const same =
					operation.tags.length === row.tags.length &&
					operation.tags.every((t) => row.tags.includes(t));
				if (same) warnings.push("Tags are already exactly this");
			}
			const org = await resolveOrganization(operation.organization, ec);
			if (typeof org === "string") return org;
			warnings.push(...org.warnings);
			const full = await tc.caller.contacts.byId({ id: row.id });
			return {
				operation,
				label: row.name || row.email || "Unnamed",
				before: {
					name: row.name,
					email: row.email,
					title: full.contact.title,
					phone: row.phone,
					status: row.status,
					tags: row.tags,
					pocs: full.contact.pocs,
					notes: full.contact.notes,
					alternateEmails: full.contact.alternateEmails,
					organization: row.organizationName,
				},
				organization: org.organization,
				warnings,
			};
		}

		case "remove_contact": {
			const row = (await lookups.contacts()).find((r) => r.id === operation.id);
			if (!row) return `no live contact has the id ${operation.id}`;
			return {
				operation,
				label: row.name || row.email || "Unnamed",
				before: {
					name: row.name,
					email: row.email,
					status: row.status,
					organization: row.organizationName,
				},
				warnings: [],
			};
		}

		case "create_organization": {
			const key = operation.name.trim().toLowerCase();
			if (ec.introducedOrganizations.has(key))
				return `"${operation.name}" appears twice in this proposal`;
			const existing = await lookups.organizationByName(operation.name);
			if (existing)
				return `an organization named "${existing.name}" already exists (id ${existing.id})`;
			ec.introducedOrganizations.add(key);
			return { operation, label: operation.name, before: null, warnings: [] };
		}

		case "update_organization": {
			const row = (await lookups.organizations()).find(
				(o) => o.id === operation.id,
			);
			if (!row) return `no organization has the id ${operation.id}`;
			if (
				operation.name &&
				operation.name.toLowerCase() !== row.name.toLowerCase()
			) {
				const clash = await lookups.organizationByName(operation.name);
				if (clash) return `"${clash.name}" already exists (id ${clash.id})`;
			}
			return {
				operation,
				label: row.name,
				before: { name: row.name, domain: row.domain, notes: row.notes },
				warnings: [],
			};
		}

		case "remove_organization": {
			const row = (await lookups.organizations()).find(
				(o) => o.id === operation.id,
			);
			if (!row) return `no organization has the id ${operation.id}`;
			return {
				operation,
				label: row.name,
				before: { name: row.name, domain: row.domain, contacts: row.contacts },
				warnings: row.contacts
					? [
							`${row.contacts} ${row.contacts === 1 ? "person stays" : "people stay"} on the list with no organization`,
						]
					: [],
			};
		}

		case "create_update": {
			const post = (await lookups.posts()).find(
				(p) => p.slug === operation.slug,
			);
			if (!post) return `no post named "${operation.slug}" in content/blog`;
			if (post.used) return `"${post.name}" is already an update`;
			return {
				operation,
				label: post.name,
				before: null,
				warnings:
					post.visibility !== "public"
						? [
								"The post is not public, so a link to it only works for people who have it",
							]
						: [],
			};
		}

		case "remove_update": {
			const row = (await lookups.updates()).find((u) => u.id === operation.id);
			if (!row) return `no update has the id ${operation.id}`;
			if (row.recipients > 0)
				return `"${row.title}" has ${row.recipients} links out; revoke them first, or leave it`;
			return {
				operation,
				label: row.title,
				before: { title: row.title },
				warnings: [],
			};
		}

		case "create_links": {
			const target = (await lookups.updates()).find(
				(u) => u.id === operation.updateId,
			);
			if (!target) return `no update has the id ${operation.updateId}`;
			const rows = await lookups.contacts();
			const missing = operation.contactIds.filter(
				(id) => !rows.some((r) => r.id === id),
			);
			if (missing.length)
				return `no live contact has the id ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? ` and ${missing.length - 3} more` : ""}`;
			const { recipients } = await tc.caller.updates.byId({
				id: operation.updateId,
			});
			const already = operation.contactIds.filter((id) =>
				recipients.some((r) => r.contactId === id),
			).length;
			return {
				operation,
				label: target.title,
				before: null,
				warnings: already
					? [`${already} of them already have a link and keep it`]
					: [],
			};
		}

		case "revoke_link": {
			const [row] = await tc.ctx.db
				.select({
					id: link.id,
					revokedAt: link.revokedAt,
					contactName: contact.name,
					contactEmail: contact.email,
					updateTitle: update.title,
				})
				.from(link)
				.innerJoin(contact, eq(contact.id, link.contactId))
				.innerJoin(update, eq(update.id, link.updateId))
				.where(eq(link.id, operation.id))
				.limit(1);
			if (!row) return `no link has the id ${operation.id}`;
			if (row.revokedAt) return "that link is already revoked";
			return {
				operation,
				label: `${row.contactName || row.contactEmail}, ${row.updateTitle}`,
				before: {
					contact: row.contactName || row.contactEmail,
					update: row.updateTitle,
				},
				warnings: [],
			};
		}

		case "invite": {
			const email = operation.email.toLowerCase();
			const rows = await lookups.roster();
			const live = rows.find(
				(r) => r.email.toLowerCase() === email && !r.revokedAt,
			);
			if (live) return `${email} can already sign in`;
			const revoked = rows.find((r) => r.email.toLowerCase() === email);
			return {
				operation,
				label: email,
				before: null,
				warnings: revoked ? ["Was revoked before; this lets them back in"] : [],
			};
		}

		case "revoke_access": {
			const row = (await lookups.roster()).find((r) => r.id === operation.id);
			if (!row) return `no invite has the id ${operation.id}`;
			if (row.revokedAt) return `${row.email} is already revoked`;
			if (row.isYou)
				return "that is your own account; somebody else has to remove you";
			return {
				operation,
				label: row.email,
				before: { email: row.email, name: row.name },
				warnings: row.signedInAt ? ["Ends their current session too"] : [],
			};
		}

		case "restore_access": {
			const row = (await lookups.roster()).find((r) => r.id === operation.id);
			if (!row) return `no invite has the id ${operation.id}`;
			if (!row.revokedAt) return `${row.email} is not revoked`;
			return {
				operation,
				label: row.email,
				before: { email: row.email },
				warnings: [],
			};
		}
	}
}
