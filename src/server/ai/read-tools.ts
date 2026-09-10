import { contact, user } from "@/db/schema";
import { parseRecipients } from "@/lib/recipients";
import { CONTACT_STATUSES, STATUS_LABEL, normalizeStatus } from "@/lib/status";
import { search } from "@/server/search";
import { inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import type { Caller, SignedIn } from "./caller";

/**
 * What the assistant can look at. Every one of these is a read: it runs the
 * moment the model asks, without anybody confirming, because looking at a
 * list you are already signed in to is not a decision.
 *
 * Each returns a compact object rather than a table dump. The model pays for
 * every character in a result, and a contact is `{id, name, email, status}`
 * to it, not sixteen columns of timestamps.
 */

export type ToolContext = { ctx: SignedIn; caller: Caller };

/** POCs are user ids; the model reads names. Old values pass through. */
async function pocNames(ctx: SignedIn) {
	const rows = await ctx.db.select({ id: user.id, name: user.name }).from(user);
	const names = new Map(rows.map((r) => [r.id, r.name]));
	return (value: string) => names.get(value) ?? value;
}

export type ReadTool<Schema extends z.ZodObject = z.ZodObject> = {
	name: string;
	description: string;
	schema: Schema;
	run: (
		input: z.infer<Schema>,
		tc: ToolContext,
	) => Promise<{ summary: string; content: unknown }>;
};

function define<Schema extends z.ZodObject>(
	tool: ReadTool<Schema>,
): ReadTool<Schema> {
	return tool;
}

const plural = (n: number, word: string) =>
	`${n} ${word}${n === 1 ? "" : word.endsWith("s") ? "es" : "s"}`;

const day = (value: Date | string | null | undefined) =>
	value ? new Date(value).toISOString().slice(0, 10) : null;

/** Rows past this are counted, not listed. The model can narrow and ask again. */
const LIST_CAP = 150;

export const listContacts = define({
	name: "list_contacts",
	description:
		"Every live contact, optionally narrowed. Use this for counting, grouping and 'who is...' questions. Matches are exact on status and organization and case-insensitive substrings on tag, poc and query (query looks at name, email, title, organization, tags and POCs). Each row carries lastTouch, the date of the latest logged interaction. Returns at most 150 rows plus the total; narrow the filters if the total is larger.",
	schema: z.object({
		status: z.enum(CONTACT_STATUSES).optional(),
		tag: z.string().optional(),
		poc: z
			.string()
			.optional()
			.describe("Somebody in the house who holds the relationship."),
		organization: z
			.string()
			.optional()
			.describe("An organization id or its exact name."),
		query: z.string().optional(),
		includeNotes: z.boolean().optional().default(false),
	}),
	async run(input, { ctx, caller }) {
		const rows = await caller.contacts.list();
		const needle = input.query?.trim().toLowerCase();
		const tag = input.tag?.trim().toLowerCase();
		const poc = input.poc?.trim().toLowerCase();
		const org = input.organization?.trim().toLowerCase();
		const pocName = await pocNames(ctx);

		const matched = rows.filter((row) => {
			if (input.status && normalizeStatus(row.status) !== input.status)
				return false;
			if (
				org &&
				row.organizationId?.toLowerCase() !== org &&
				row.organizationName?.toLowerCase() !== org
			)
				return false;
			if (tag && !row.tags.some((t) => t.toLowerCase().includes(tag)))
				return false;
			if (poc && !row.pocs.some((p) => pocName(p).toLowerCase().includes(poc)))
				return false;
			if (
				needle &&
				![
					row.name,
					row.email,
					row.title,
					row.organizationName,
					...row.tags,
					...row.pocs.map(pocName),
				]
					.filter(Boolean)
					.some((field) => String(field).toLowerCase().includes(needle))
			)
				return false;
			return true;
		});

		let notes: Map<string, string | null> | null = null;
		if (input.includeNotes && matched.length > 0) {
			const ids = matched.slice(0, LIST_CAP).map((row) => row.id);
			const withNotes = await ctx.db
				.select({ id: contact.id, notes: contact.notes })
				.from(contact)
				.where(inArray(contact.id, ids));
			notes = new Map(withNotes.map((row) => [row.id, row.notes]));
		}

		return {
			summary: plural(matched.length, "contact"),
			content: {
				total: matched.length,
				shown: Math.min(matched.length, LIST_CAP),
				contacts: matched.slice(0, LIST_CAP).map((row) => ({
					id: row.id,
					name: row.name,
					email: row.email,
					title: row.title,
					pocs: row.pocs.map(pocName),
					lastTouch: row.lastTouch ? row.lastTouch.slice(0, 10) : null,
					status: row.status,
					organization: row.organizationName,
					organizationId: row.organizationId,
					tags: row.tags,
					phone: row.phone,
					addedOn: day(row.createdAt),
					...(notes ? { notes: notes.get(row.id) ?? null } : {}),
				})),
			},
		};
	},
});

export const getContact = define({
	name: "get_contact",
	description:
		"One person in full: every field, their organization, the tracked links they were sent with click counts, and the recent history of edits and opens. Give an id or an email.",
	schema: z.object({
		id: z.uuid().optional(),
		email: z.string().optional(),
	}),
	async run(input, { ctx, caller }) {
		let id = input.id;
		if (!id && input.email) {
			const needle = input.email.trim().toLowerCase();
			const rows = await caller.contacts.list();
			id = rows.find((r) => r.email?.toLowerCase() === needle)?.id;
			if (!id) {
				return {
					summary: "no match",
					content: { error: `Nobody on the list has the address ${needle}.` },
				};
			}
		}
		if (!id) {
			return {
				summary: "no id",
				content: { error: "Give an id or an email." },
			};
		}

		const [{ contact, organization }, links, timeline, logged, pocName] =
			await Promise.all([
				caller.contacts.byId({ id }),
				caller.links.byContact({ contactId: id }),
				caller.contacts.timeline({ id }),
				caller.interactions.byContact({ contactId: id }),
				pocNames(ctx),
			]);

		return {
			summary: contact.name || contact.email || "Unnamed",
			content: {
				id: contact.id,
				name: contact.name,
				email: contact.email,
				title: contact.title,
				alternateEmails: contact.alternateEmails,
				phone: contact.phone,
				status: contact.status,
				tags: contact.tags,
				pocs: contact.pocs.map(pocName),
				notes: contact.notes,
				interactions: logged.map((i) => ({
					id: i.id,
					on: day(i.occurredAt),
					topic: i.topic,
					summary: i.summary,
				})),
				organization: organization
					? { id: organization.id, name: organization.name }
					: null,
				addedOn: day(contact.createdAt),
				deleted: contact.deletedAt !== null,
				links: links.map((l) => ({
					id: l.id,
					update: l.updateTitle,
					updateId: l.updateId,
					clicks: l.clicks,
					revoked: l.revokedAt !== null,
					sentOn: day(l.createdAt),
				})),
				history: timeline.slice(0, 25).map((e) => ({
					on: day(e.at),
					what:
						e.kind === "click"
							? `opened "${e.updateTitle}"${e.automated ? " (automated)" : ""}`
							: e.field
								? `${e.field}: ${e.oldValue ?? "nothing"} → ${e.newValue ?? "nothing"}`
								: e.verb,
					by: e.actorName,
				})),
			},
		};
	},
});

export const listOrganizations = define({
	name: "list_organizations",
	description:
		"Every organization with its domain and how many live contacts it has. Optional case-insensitive filter on name or domain.",
	schema: z.object({ query: z.string().optional() }),
	async run(input, { caller }) {
		const rows = await caller.organizations.list();
		const needle = input.query?.trim().toLowerCase();
		const matched = needle
			? rows.filter(
					(r) =>
						r.name.toLowerCase().includes(needle) ||
						r.domain?.toLowerCase().includes(needle),
				)
			: rows;
		return {
			summary: plural(matched.length, "organization"),
			content: {
				total: matched.length,
				organizations: matched.slice(0, LIST_CAP).map((r) => ({
					id: r.id,
					name: r.name,
					domain: r.domain,
					contacts: r.contacts,
					notes: r.notes,
				})),
			},
		};
	},
});

export const getOrganization = define({
	name: "get_organization",
	description: "One organization and everybody filed under it.",
	schema: z.object({
		id: z.uuid().optional(),
		name: z.string().optional(),
	}),
	async run(input, { caller }) {
		let id = input.id;
		if (!id && input.name) {
			const needle = input.name.trim().toLowerCase();
			const rows = await caller.organizations.list();
			id = rows.find((r) => r.name.toLowerCase() === needle)?.id;
			if (!id) {
				return {
					summary: "no match",
					content: { error: `No organization named ${input.name}.` },
				};
			}
		}
		if (!id)
			return { summary: "no id", content: { error: "Give an id or a name." } };

		const { organization, members } = await caller.organizations.byId({ id });
		return {
			summary: organization.name,
			content: {
				id: organization.id,
				name: organization.name,
				domain: organization.domain,
				notes: organization.notes,
				members: members.map((m) => ({
					id: m.id,
					name: m.name,
					email: m.email,
					status: m.status,
				})),
			},
		};
	},
});

export const listUpdates = define({
	name: "list_updates",
	description:
		"Every investor update that has gone out, newest first, with how many people got a link and how many of them opened it (automated scanners excluded).",
	schema: z.object({}),
	async run(_input, { caller }) {
		const rows = await caller.updates.list();
		return {
			summary: plural(rows.length, "update"),
			content: rows.map((r) => ({
				id: r.id,
				slug: r.slug,
				title: r.title,
				sentOn: day(r.createdAt),
				recipients: r.recipients,
				opened: r.opened,
			})),
		};
	},
});

export const listPosts = define({
	name: "list_posts",
	description:
		"The markdown posts in content/blog that an update can be made from, with whether each has already been turned into one. Needed before create_update.",
	schema: z.object({}),
	async run(_input, { caller }) {
		const rows = await caller.updates.availablePosts();
		return {
			summary: plural(rows.length, "post"),
			content: rows.map((r) => ({
				slug: r.slug,
				title: r.name,
				date: r.date,
				visibility: r.visibility,
				alreadyAnUpdate: r.used,
			})),
		};
	},
});

export const getUpdate = define({
	name: "get_update",
	description:
		"One update with every recipient: who was sent a link, whether it is revoked, how many times they opened it and when they first did.",
	schema: z.object({ id: z.uuid() }),
	async run(input, { caller }) {
		const { update, recipients } = await caller.updates.byId({ id: input.id });
		return {
			summary: update.title,
			content: {
				id: update.id,
				slug: update.slug,
				title: update.title,
				sentOn: day(update.createdAt),
				recipients: recipients.map((r) => ({
					linkId: r.id,
					contactId: r.contactId,
					name: r.contactName,
					email: r.contactEmail,
					clicks: r.clicks,
					firstOpenedOn: day(r.firstClickAt),
					revoked: r.revokedAt !== null,
				})),
			},
		};
	},
});

export const listAccess = define({
	name: "list_access",
	description:
		"Who can sign in to this admin: every invited address, whether it is revoked, and whether that person has ever signed in.",
	schema: z.object({}),
	async run(_input, { caller }) {
		const rows = await caller.access.list();
		return {
			summary: plural(rows.length, "address"),
			content: rows.map((r) => ({
				id: r.id,
				email: r.email,
				name: r.name,
				invitedOn: day(r.createdAt),
				revoked: r.revokedAt !== null,
				hasSignedIn: r.signedInAt !== null,
				isYou: r.isYou,
			})),
		};
	},
});

export const getStats = define({
	name: "get_stats",
	description:
		"The numbers at a glance: contacts by status, the biggest organizations, the most-used tags, how many people were added recently, and open rates per update. Start here for any 'how are we doing' question.",
	schema: z.object({}),
	async run(_input, { caller }) {
		const [contacts, organizations, updates] = await Promise.all([
			caller.contacts.list(),
			caller.organizations.list(),
			caller.updates.list(),
		]);

		const byStatus = Object.fromEntries(
			CONTACT_STATUSES.map((s) => [s, 0]),
		) as Record<(typeof CONTACT_STATUSES)[number], number>;
		const tags = new Map<string, number>();
		const now = Date.now();
		let last7 = 0;
		let last30 = 0;

		for (const c of contacts) {
			byStatus[normalizeStatus(c.status)] += 1;
			for (const t of c.tags) tags.set(t, (tags.get(t) ?? 0) + 1);
			const age = now - new Date(c.createdAt).getTime();
			if (age < 7 * 86_400_000) last7 += 1;
			if (age < 30 * 86_400_000) last30 += 1;
		}

		return {
			summary: `${plural(contacts.length, "contact")}, ${plural(organizations.length, "organization")}`,
			content: {
				contacts: {
					total: contacts.length,
					byStatus: Object.fromEntries(
						CONTACT_STATUSES.map((s) => [STATUS_LABEL[s], byStatus[s]]),
					),
					addedLast7Days: last7,
					addedLast30Days: last30,
					withoutOrganization: contacts.filter((c) => !c.organizationId).length,
				},
				organizations: {
					total: organizations.length,
					largest: [...organizations]
						.sort((a, b) => b.contacts - a.contacts)
						.slice(0, 15)
						.map((o) => ({ id: o.id, name: o.name, contacts: o.contacts })),
				},
				tags: [...tags.entries()]
					.sort((a, b) => b[1] - a[1])
					.slice(0, 25)
					.map(([tag, count]) => ({ tag, count })),
				updates: updates.map((u) => ({
					id: u.id,
					title: u.title,
					sentOn: day(u.createdAt),
					recipients: u.recipients,
					opened: u.opened,
					openRate: u.recipients
						? Math.round((u.opened / u.recipients) * 100) / 100
						: null,
				})),
			},
		};
	},
});

export const searchRecords = define({
	name: "search_records",
	description:
		"The admin's own search: a literal match on names, emails and titles first, then a semantic match, across people, organizations and updates. Use it when you have a fragment or a description rather than an exact name.",
	schema: z.object({
		query: z.string().min(1).max(200),
		limit: z.number().int().min(1).max(30).optional().default(10),
	}),
	async run(input) {
		const result = await search(input.query, input.limit);
		return {
			summary: plural(result.hits.length, "hit"),
			content: {
				semantic: result.semantic,
				hits: result.hits.map((h) => ({
					kind: h.kind,
					id: h.id,
					title: h.title,
					subtitle: h.subtitle,
					status: h.status,
					match: h.match,
					similarity: h.similarity,
				})),
			},
		};
	},
});

export const parseContactList = define({
	name: "parse_contact_list",
	description:
		"Reads a pasted block of people, one per line, in the shapes people copy out of spreadsheets and mail clients ('jane@x.com', 'Jane Doe <jane@x.com>', 'Jane Doe, jane@x.com'). Says which addresses are already on the list (including as alternate addresses), which organization each new one would be filed under by its domain, and which lines could not be read. Always call this before proposing to add a pasted list.",
	schema: z.object({ text: z.string().min(1).max(200_000) }),
	async run(input, { ctx, caller }) {
		const { recipients, invalid } = parseRecipients(input.text);
		const [contacts, organizations, alternateRows] = await Promise.all([
			caller.contacts.list(),
			caller.organizations.list(),
			// Alternate addresses are not in the list query, and they are the
			// whole reason a paste can recognise somebody under an old address.
			ctx.db
				.select({ id: contact.id, alternateEmails: contact.alternateEmails })
				.from(contact)
				.where(isNull(contact.deletedAt)),
		]);

		const byEmail = new Map(
			contacts
				.filter((c) => c.email)
				.map((c) => [(c.email as string).toLowerCase(), c]),
		);
		const alternates = new Map<string, string>();
		for (const row of alternateRows) {
			for (const alt of row.alternateEmails)
				alternates.set(alt.toLowerCase(), row.id);
		}
		const byDomain = new Map(
			organizations
				.filter((o) => o.domain)
				.map((o) => [o.domain as string, { id: o.id, name: o.name }]),
		);

		const rows = recipients.map((r) => {
			const key = r.email.toLowerCase();
			const existing = byEmail.get(key);
			const viaAlternate = alternates.get(key);
			const domain = key.split("@")[1] ?? "";
			return {
				name: r.name,
				email: key,
				existingContactId: existing?.id ?? viaAlternate ?? null,
				existingName: existing?.name ?? null,
				suggestedOrganization: byDomain.get(domain) ?? null,
			};
		});

		const fresh = rows.filter((r) => !r.existingContactId).length;
		return {
			summary: `${plural(rows.length, "address")}, ${fresh} new`,
			content: {
				parsed: rows.length,
				new: fresh,
				alreadyOnList: rows.length - fresh,
				unreadable: invalid,
				rows,
			},
		};
	},
});

export const listTags = define({
	name: "list_tags",
	description:
		"Every tag that exists, with how many people carry it. Check this before tagging so an existing spelling is reused; a tag given to a contact that does not exist yet is created.",
	schema: z.object({}),
	async run(_input, { caller }) {
		const rows = await caller.tags.list();
		return {
			summary: plural(rows.length, "tag"),
			content: rows.map((t) => ({ id: t.id, name: t.name, people: t.count })),
		};
	},
});

export const READ_TOOLS: ReadTool[] = [
	getStats,
	listContacts,
	getContact,
	listOrganizations,
	getOrganization,
	listUpdates,
	getUpdate,
	listPosts,
	listAccess,
	listTags,
	searchRecords,
	parseContactList,
] as unknown as ReadTool[];
