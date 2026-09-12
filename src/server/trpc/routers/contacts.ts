import type { Db } from "@/db";
import {
	activity,
	contact,
	duplicateDismissal,
	interaction,
	link,
	linkEvent,
	organization,
	update,
	user,
} from "@/db/schema";
import { isAutomatedClick } from "@/lib/bots";
import { parseRecipients } from "@/lib/recipients";
import { CONTACT_STATUSES } from "@/lib/status";
import {
	indexContacts,
	indexOrganizations,
	reindexQuietly,
} from "@/server/search";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { fieldChanges, logActivity } from "../activity";
import { createTRPCRouter, protectedProcedure } from "../init";
import { registerTags } from "./tags";

const email = z.email("That is not an email address.").trim().toLowerCase();

const optionalText = z
	.string()
	.trim()
	.nullish()
	.transform((v) => v || null);

const contactInput = z.object({
	name: optionalText,
	/** Optional, and "" from a form is the same as none. */
	email: z
		.union([z.literal(""), email])
		.nullish()
		.transform((v) => v || null),
	title: optionalText,
	alternateEmails: z.array(email).default([]),
	phone: z
		.string()
		.trim()
		.nullish()
		.transform((v) => v || null),
	organizationId: z
		.uuid()
		.nullish()
		.transform((v) => v || null),
	status: z.enum(CONTACT_STATUSES).default("prospect"),
	tags: z.array(z.string().trim().min(1)).default([]),
	pocs: z.array(z.string().trim().min(1)).default([]),
	notes: optionalText,
});

/**
 * Somebody has to be findable by something. Checked here rather than with a
 * refinement on the schema, because `.partial()` for updates would not
 * survive one, and an update only knows whether the row still has a name or
 * an address once it is merged with what is there.
 */
function requireIdentity(row: { name: string | null; email: string | null }) {
	if (!row.name && !row.email) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "A name or an email is needed.",
		});
	}
}

/** Names compared the way a person would: case, punctuation and spacing aside. */
function normalizeName(name: string | null) {
	return (name ?? "")
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s]/gu, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function normalizePhone(phone: string | null) {
	return (phone ?? "").replace(/\D/g, "");
}

/**
 * POCs are user ids. Anything else handed in (a first name from the
 * assistant, "Will" from an import) is matched to the roster when exactly
 * one person fits, and otherwise kept as written so it is not lost: the
 * UI shows it as plain text until that person has an account.
 */
async function resolvePocs(db: Db, values: string[]): Promise<string[]> {
	const wanted = [...new Set(values.map((v) => v.trim()).filter(Boolean))];
	if (wanted.length === 0) return [];
	const people = await db
		.select({ id: user.id, name: user.name, email: user.email })
		.from(user);
	const ids = new Set(people.map((p) => p.id));
	return [
		...new Set(
			wanted.map((v) => {
				if (ids.has(v)) return v;
				const needle = v.toLowerCase();
				const fits = people.filter((p) => {
					const name = p.name.toLowerCase();
					return (
						name === needle ||
						name.split(/\s+/)[0] === needle ||
						p.email.toLowerCase() === needle ||
						p.email.toLowerCase().split("@")[0] === needle
					);
				});
				return fits.length === 1 ? fits[0].id : v;
			}),
		),
	];
}

/**
 * Trigram similarity, 0 to 1. Calibrated on the real list: 0.7 catches a
 * dropped or swapped letter ("Goldstien"); 0.5 alone pairs "Sean Spector"
 * with "Dan Spector", so below 0.7 the organization has to match too.
 */
const FUZZY_HIGH = 0.7;
const FUZZY_LOW = 0.5;

function pairKey(a: string, b: string) {
	return a < b ? `${a}:${b}` : `${b}:${a}`;
}

/** Postgres reports the partial unique index by name; say something useful. */
function rethrowDuplicate(err: unknown): never {
	if (String(err).includes("one_contact_per_email")) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "Somebody with that address is already on the list.",
		});
	}
	throw err;
}

export const contactsRouter = createTRPCRouter({
	list: protectedProcedure.query(async ({ ctx }) => {
		return ctx.db
			.select({
				id: contact.id,
				name: contact.name,
				email: contact.email,
				title: contact.title,
				phone: contact.phone,
				status: contact.status,
				tags: contact.tags,
				pocs: contact.pocs,
				createdAt: contact.createdAt,
				organizationId: contact.organizationId,
				organizationName: organization.name,
				/** When we last did anything with them, from the interaction log. */
				lastTouch: sql<string | null>`(
					select max(${interaction.occurredAt})
					from ${interaction}
					where ${interaction.contactId} = ${contact.id}
				)`,
			})
			.from(contact)
			.leftJoin(organization, eq(organization.id, contact.organizationId))
			.where(isNull(contact.deletedAt))
			.orderBy(sql`lower(coalesce(${contact.name}, ${contact.email}))`);
	}),

	byId: protectedProcedure
		.input(z.object({ id: z.uuid() }))
		.query(async ({ ctx, input }) => {
			const [row] = await ctx.db
				.select()
				.from(contact)
				.where(eq(contact.id, input.id))
				.limit(1);

			if (!row) {
				throw new TRPCError({ code: "NOT_FOUND", message: "No such contact." });
			}

			const org = row.organizationId
				? (
						await ctx.db
							.select()
							.from(organization)
							.where(eq(organization.id, row.organizationId))
							.limit(1)
					)[0]
				: null;

			return { contact: row, organization: org ?? null };
		}),

	/**
	 * The merged history: what we changed about somebody, and what they did.
	 *
	 * These are two tables with nothing in common but a timestamp, so they are
	 * unioned here rather than in SQL. Reading "opened the Q3 letter" directly
	 * above "status changed to committed" is the point of the drawer.
	 */
	timeline: protectedProcedure
		.input(z.object({ id: z.uuid() }))
		.query(async ({ ctx, input }) => {
			const edits = await ctx.db
				.select({
					at: activity.createdAt,
					verb: activity.verb,
					field: activity.field,
					oldValue: activity.oldValue,
					newValue: activity.newValue,
					actorName: user.name,
				})
				.from(activity)
				.leftJoin(user, eq(user.id, activity.actorUserId))
				.where(
					and(
						eq(activity.entityType, "contact"),
						eq(activity.entityId, input.id),
					),
				)
				.orderBy(desc(activity.createdAt))
				.limit(200);

			const logged = await ctx.db
				.select({
					at: interaction.occurredAt,
					topic: interaction.topic,
					summary: interaction.summary,
				})
				.from(interaction)
				.where(eq(interaction.contactId, input.id))
				.orderBy(desc(interaction.occurredAt))
				.limit(200);

			const clicks = await ctx.db
				.select({
					at: linkEvent.createdAt,
					userAgent: linkEvent.userAgent,
					updateTitle: update.title,
					updateSlug: update.slug,
				})
				.from(linkEvent)
				.innerJoin(link, eq(link.ref, linkEvent.ref))
				.innerJoin(update, eq(update.id, link.updateId))
				.where(eq(link.contactId, input.id))
				.orderBy(desc(linkEvent.createdAt))
				.limit(200);

			const entries = [
				...edits.map((e) => ({
					kind: "edit" as const,
					at: e.at,
					verb: e.verb,
					field: e.field,
					oldValue: e.oldValue,
					newValue: e.newValue,
					actorName: e.actorName,
					updateTitle: null as string | null,
					automated: false,
				})),
				...clicks.map((c) => ({
					kind: "click" as const,
					at: c.at,
					verb: "opened",
					field: null as string | null,
					oldValue: null as string | null,
					newValue: c.updateSlug,
					actorName: null as string | null,
					updateTitle: c.updateTitle,
					automated: isAutomatedClick(c.userAgent),
				})),
				...logged.map((l) => ({
					kind: "interaction" as const,
					at: l.at,
					verb: "logged",
					field: l.topic,
					oldValue: null as string | null,
					newValue: l.summary,
					actorName: null as string | null,
					updateTitle: null as string | null,
					automated: false,
				})),
			];

			entries.sort((a, b) => b.at.getTime() - a.at.getTime());
			return entries;
		}),

	create: protectedProcedure
		.input(contactInput)
		.mutation(async ({ ctx, input }) => {
			requireIdentity(input);
			const tags = await registerTags(ctx.db, input.tags, ctx.user.id);
			const pocs = await resolvePocs(ctx.db, input.pocs);
			const [row] = await ctx.db
				.insert(contact)
				.values({ ...input, tags, pocs })
				.returning()
				.catch(rethrowDuplicate);

			await logActivity({
				actorUserId: ctx.user.id,
				entityType: "contact",
				entityId: row.id,
				verb: "created",
			});

			// The organization's own document lists its people, so it moves too.
			await reindexQuietly(async () => {
				await indexContacts({ ids: [row.id] });
				if (row.organizationId)
					await indexOrganizations({ ids: [row.organizationId] });
			});

			return row;
		}),

	update: protectedProcedure
		.input(contactInput.partial().extend({ id: z.uuid() }))
		.mutation(async ({ ctx, input }) => {
			const { id, ...patch } = input;

			const [before] = await ctx.db
				.select()
				.from(contact)
				.where(eq(contact.id, id))
				.limit(1);

			if (!before) {
				throw new TRPCError({ code: "NOT_FOUND", message: "No such contact." });
			}
			requireIdentity({ ...before, ...patch });
			if (patch.tags) {
				patch.tags = await registerTags(ctx.db, patch.tags, ctx.user.id);
			}
			if (patch.pocs) {
				patch.pocs = await resolvePocs(ctx.db, patch.pocs);
			}

			const [row] = await ctx.db
				.update(contact)
				.set({ ...patch, updatedAt: new Date() })
				.where(eq(contact.id, id))
				.returning()
				.catch(rethrowDuplicate);

			await logActivity(
				fieldChanges(
					{ actorUserId: ctx.user.id, entityType: "contact", entityId: id },
					before,
					patch,
					[
						"name",
						"email",
						"title",
						"phone",
						"status",
						"tags",
						"pocs",
						"notes",
						"organizationId",
						"alternateEmails",
					],
				),
			);

			await reindexQuietly(async () => {
				await indexContacts({ ids: [id] });
				const orgs = [before.organizationId, row.organizationId].filter(
					(v): v is string => Boolean(v),
				);
				if (orgs.length) await indexOrganizations({ ids: [...new Set(orgs)] });
			});

			return row;
		}),

	remove: protectedProcedure
		.input(z.object({ id: z.uuid() }))
		.mutation(async ({ ctx, input }) => {
			// Soft: their links and click history are the reason the record was
			// worth keeping, and a delete that takes those with it is not undoable.
			await ctx.db
				.update(contact)
				.set({ deletedAt: new Date() })
				.where(eq(contact.id, input.id));

			await logActivity({
				actorUserId: ctx.user.id,
				entityType: "contact",
				entityId: input.id,
				verb: "deleted",
			});

			return { deleted: true };
		}),

	/**
	 * Paste a block of addresses, one per line, in any of the shapes people
	 * actually copy out of a spreadsheet or a mail client.
	 *
	 * Addresses already on the list are reported rather than inserted, and
	 * matching looks at alternate addresses too, which is the only thing those
	 * are for. An unmatched address whose domain belongs to a known
	 * organization is filed there instead of leaving fourteen rows to set by
	 * hand.
	 */
	importPaste: protectedProcedure
		.input(z.object({ text: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const { recipients, invalid } = parseRecipients(input.text);
			if (recipients.length === 0) {
				return { created: 0, skipped: [] as string[], invalid };
			}

			const addresses = recipients.map((r) => r.email.toLowerCase());

			const existing = await ctx.db
				.select({ email: contact.email, alternates: contact.alternateEmails })
				.from(contact)
				.where(
					and(
						isNull(contact.deletedAt),
						or(
							inArray(sql`lower(${contact.email})`, addresses),
							sql`${contact.alternateEmails} && ${addresses}::text[]`,
						),
					),
				);

			const taken = new Set<string>();
			for (const row of existing) {
				if (row.email) taken.add(row.email.toLowerCase());
				for (const alt of row.alternates) taken.add(alt.toLowerCase());
			}

			const orgs = await ctx.db
				.select({ id: organization.id, domain: organization.domain })
				.from(organization);
			const byDomain = new Map(
				orgs.filter((o) => o.domain).map((o) => [o.domain as string, o.id]),
			);

			const fresh = recipients.filter((r) => !taken.has(r.email.toLowerCase()));
			if (fresh.length === 0) {
				return {
					created: 0,
					skipped: recipients.map((r) => r.email),
					invalid,
				};
			}

			const rows = await ctx.db
				.insert(contact)
				.values(
					fresh.map((r) => ({
						name: r.name,
						email: r.email.toLowerCase(),
						organizationId:
							byDomain.get(r.email.toLowerCase().split("@")[1] ?? "") ?? null,
					})),
				)
				.returning({ id: contact.id })
				.catch(rethrowDuplicate);

			await logActivity(
				rows.map((row) => ({
					actorUserId: ctx.user.id,
					entityType: "contact" as const,
					entityId: row.id,
					verb: "imported",
				})),
			);

			await reindexQuietly(async () => {
				await indexContacts({ ids: rows.map((row) => row.id) });
				await indexOrganizations({ ids: [...byDomain.values()] });
			});

			return {
				created: rows.length,
				skipped: recipients
					.filter((r) => taken.has(r.email.toLowerCase()))
					.map((r) => r.email),
				invalid,
			};
		}),
	/**
	 * One tag onto many people, from the selection bar. Skips anybody who
	 * already has it, so the count in the toast is the number that changed.
	 */
	addTag: protectedProcedure
		.input(
			z.object({
				contactIds: z.array(z.uuid()).min(1).max(500),
				tag: z.string().trim().min(1).max(60),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [name] = await registerTags(ctx.db, [input.tag], ctx.user.id);
			const touched = await ctx.db
				.update(contact)
				.set({
					tags: sql`array_append(${contact.tags}, ${name})`,
					updatedAt: new Date(),
				})
				.where(
					and(
						inArray(contact.id, input.contactIds),
						isNull(contact.deletedAt),
						sql`not (${name} = any(${contact.tags}))`,
					),
				)
				.returning({ id: contact.id });

			await logActivity(
				touched.map((row) => ({
					actorUserId: ctx.user.id,
					entityType: "contact" as const,
					entityId: row.id,
					verb: "tagged",
					newValue: name,
				})),
			);

			if (touched.length) {
				await reindexQuietly(() =>
					indexContacts({ ids: touched.map((t) => t.id) }),
				);
			}

			return { tag: name, tagged: touched.length };
		}),

	/**
	 * Rows that may be the same person as the one being typed or read: what
	 * the Add sheet asks while a name is typed, and the drawer asks for the
	 * record it shows. One trigram probe and one address lookup, so it is
	 * cheap enough to run on every pause in typing.
	 */
	twins: protectedProcedure
		.input(
			z.object({
				name: z.string().trim().max(200).optional(),
				email: z.string().trim().max(200).optional(),
				exceptId: z.uuid().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const name = (input.name ?? "").toLowerCase();
			const email = (input.email ?? "").toLowerCase();
			if (name.length < 3 && !email.includes("@")) return [];

			const rows = await ctx.db
				.select({
					id: contact.id,
					name: contact.name,
					email: contact.email,
					organizationName: organization.name,
					sameEmail: email.includes("@")
						? sql<boolean>`(lower(${contact.email}) = ${email} or ${email} = any(${contact.alternateEmails}))`
						: sql<boolean>`false`,
					similarity:
						name.length >= 3
							? sql<number>`similarity(lower(${contact.name}), ${name})`
							: sql<number>`0`,
				})
				.from(contact)
				.leftJoin(organization, eq(organization.id, contact.organizationId))
				.where(
					and(
						isNull(contact.deletedAt),
						input.exceptId
							? sql`${contact.id} <> ${input.exceptId}`
							: undefined,
						or(
							email.includes("@")
								? sql`(lower(${contact.email}) = ${email} or ${email} = any(${contact.alternateEmails}))`
								: sql`false`,
							name.length >= 3
								? sql`(lower(${contact.name}) % ${name} and similarity(lower(${contact.name}), ${name}) >= ${FUZZY_LOW})`
								: sql`false`,
						),
					),
				)
				.orderBy(sql`2 desc, 1 desc`)
				.limit(5);

			// Who, not why: the person reading can tell two Alexes apart by
			// looking, so the rows carry no reasons or confidence.
			return rows.map((row) => ({
				id: row.id,
				name: row.name,
				email: row.email,
				organizationName: row.organizationName,
			}));
		}),

	/**
	 * People who may be the same person, worked out on read rather than
	 * stored: the list is small and the heuristics will change.
	 *
	 * Two people are a pair when the names match (case, punctuation and
	 * spacing aside), the phone numbers match, one's address is the other's
	 * alternate, the names are nearly the same by trigram (Goldstien /
	 * Goldstein), or fairly alike at the same organization. Not
	 * the embeddings: two colleagues with similar notes sit closer in that
	 * space than one person entered twice with different notes, which was
	 * measured before deciding. Pairs somebody has dismissed are left out,
	 * and candidates are clustered so three spellings of one person are one
	 * group, not three pairs.
	 */
	duplicates: protectedProcedure.query(async ({ ctx }) => {
		const rows = await ctx.db
			.select({
				id: contact.id,
				name: contact.name,
				email: contact.email,
				title: contact.title,
				phone: contact.phone,
				alternateEmails: contact.alternateEmails,
				status: contact.status,
				tags: contact.tags,
				pocs: contact.pocs,
				createdAt: contact.createdAt,
				organizationName: organization.name,
			})
			.from(contact)
			.leftJoin(organization, eq(organization.id, contact.organizationId))
			.where(isNull(contact.deletedAt));

		const dismissed = new Set(
			(
				await ctx.db
					.select({
						a: duplicateDismissal.contactA,
						b: duplicateDismissal.contactB,
					})
					.from(duplicateDismissal)
			).map((d) => pairKey(d.a, d.b)),
		);

		// Pairs that look like one person. A pair is a pair; nobody is told
		// why, so nothing here keeps a reason.
		const pairs = new Set<string>();
		const flag = (a: string, b: string) => {
			if (a === b) return;
			const key = pairKey(a, b);
			if (!dismissed.has(key)) pairs.add(key);
		};

		const byName = new Map<string, string[]>();
		const byPhone = new Map<string, string[]>();
		const byEmail = new Map<string, string>();
		for (const row of rows) {
			const name = normalizeName(row.name);
			if (name) byName.set(name, [...(byName.get(name) ?? []), row.id]);
			const phone = normalizePhone(row.phone);
			if (phone.length >= 7)
				byPhone.set(phone, [...(byPhone.get(phone) ?? []), row.id]);
			if (row.email) byEmail.set(row.email.toLowerCase(), row.id);
		}
		for (const ids of byName.values())
			for (const a of ids) for (const b of ids) flag(a, b);
		for (const ids of byPhone.values())
			for (const a of ids) for (const b of ids) flag(a, b);
		for (const row of rows)
			for (const alt of row.alternateEmails) {
				const owner = byEmail.get(alt.toLowerCase());
				if (owner) flag(row.id, owner);
			}

		// Fuzzy names, from the trigram index. Exact matches were caught
		// above; this is for spellings that drift.
		const alike = await ctx.db
			.select({
				a: sql<string>`a.id`,
				b: sql<string>`b.id`,
				similarity: sql<number>`similarity(lower(a.name), lower(b.name))`,
				sameOrganization: sql<boolean>`a.organization_id is not null and a.organization_id = b.organization_id`,
			})
			.from(sql`${contact} as a`)
			.innerJoin(sql`${contact} as b`, sql`a.id < b.id`)
			.where(
				sql`a.deleted_at is null and b.deleted_at is null
					and a.name is not null and b.name is not null
					and lower(a.name) % lower(b.name)
					and similarity(lower(a.name), lower(b.name)) >= ${FUZZY_LOW}
					and similarity(lower(a.name), lower(b.name)) < 0.99`,
			);
		for (const pair of alike) {
			const sim = Number(pair.similarity);
			if (sim >= FUZZY_HIGH || pair.sameOrganization) flag(pair.a, pair.b);
		}

		// Union-find, so a chain of pairs becomes one group.
		const parent = new Map<string, string>();
		const find = (x: string): string => {
			const p = parent.get(x) ?? x;
			if (p === x) return x;
			const root = find(p);
			parent.set(x, root);
			return root;
		};
		for (const key of pairs) {
			const [a, b] = key.split(":");
			parent.set(find(a), find(b));
		}
		const groups = new Map<string, Set<string>>();
		for (const key of pairs) {
			const [a, b] = key.split(":");
			const root = find(a);
			const group = groups.get(root) ?? new Set<string>();
			group.add(a);
			group.add(b);
			groups.set(root, group);
		}

		const byId = new Map(rows.map((r) => [r.id, r]));
		return [...groups.values()].map((group) => {
			const ids = [...group];
			return {
				contacts: ids
					.map((id) => byId.get(id))
					.filter((r): r is NonNullable<typeof r> => Boolean(r))
					.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
			};
		});
	}),

	/**
	 * Folds one contact into another. The kept row wins every field it has;
	 * the dropped row fills what the kept one lacks; lists (tags, POCs,
	 * alternate addresses) are unioned, with the dropped address becoming an
	 * alternate so a paste still recognises it; notes are joined. The
	 * dropped row's interactions and links move across, except a link to an
	 * update the kept row already has one for, which stays with the dropped
	 * row so neither reader's history is lost. Then the dropped row is
	 * soft-deleted, which is undoable by hand like any other delete.
	 */
	merge: protectedProcedure
		.input(z.object({ keepId: z.uuid(), dropId: z.uuid() }))
		.mutation(async ({ ctx, input }) => {
			if (input.keepId === input.dropId) {
				throw new TRPCError({ code: "BAD_REQUEST", message: "Pick two." });
			}
			const both = await ctx.db
				.select()
				.from(contact)
				.where(
					and(
						inArray(contact.id, [input.keepId, input.dropId]),
						isNull(contact.deletedAt),
					),
				);
			const keep = both.find((r) => r.id === input.keepId);
			const drop = both.find((r) => r.id === input.dropId);
			if (!keep || !drop) {
				throw new TRPCError({ code: "NOT_FOUND", message: "No such contact." });
			}

			const union = (a: string[], b: string[]) => {
				const seen = new Set<string>();
				return [...a, ...b].filter((v) => {
					const k = v.toLowerCase();
					if (seen.has(k)) return false;
					seen.add(k);
					return true;
				});
			};
			const alternates = union(
				keep.alternateEmails,
				[
					...drop.alternateEmails,
					...(drop.email && drop.email !== keep.email ? [drop.email] : []),
				].filter((e) => e.toLowerCase() !== keep.email?.toLowerCase()),
			);
			const merged = {
				name: keep.name ?? drop.name,
				email: keep.email ?? drop.email,
				title: keep.title ?? drop.title,
				phone: keep.phone ?? drop.phone,
				organizationId: keep.organizationId ?? drop.organizationId,
				// Whichever of the two has moved further along.
				status:
					keep.status === "prospect" && drop.status !== "prospect"
						? drop.status
						: keep.status,
				tags: union(keep.tags, drop.tags),
				pocs: await resolvePocs(ctx.db, union(keep.pocs, drop.pocs)),
				alternateEmails: keep.email
					? alternates.filter(
							(e) => e.toLowerCase() !== keep.email?.toLowerCase(),
						)
					: alternates,
				notes:
					keep.notes && drop.notes
						? `${keep.notes}\n\n${drop.notes}`
						: (keep.notes ?? drop.notes),
				updatedAt: new Date(),
			};

			// The dropped row is retired first, so its address stops holding the
			// partial unique index before the kept row might take it over.
			await ctx.db
				.update(contact)
				.set({ deletedAt: new Date() })
				.where(eq(contact.id, drop.id));

			await ctx.db
				.update(contact)
				.set(merged)
				.where(eq(contact.id, keep.id))
				.catch(rethrowDuplicate);

			await ctx.db
				.update(interaction)
				.set({ contactId: keep.id })
				.where(eq(interaction.contactId, drop.id));

			const keptUpdates = new Set(
				(
					await ctx.db
						.select({ updateId: link.updateId })
						.from(link)
						.where(eq(link.contactId, keep.id))
				).map((l) => l.updateId),
			);
			const movable = (
				await ctx.db
					.select({ id: link.id, updateId: link.updateId })
					.from(link)
					.where(eq(link.contactId, drop.id))
			).filter((l) => !keptUpdates.has(l.updateId));
			if (movable.length) {
				await ctx.db
					.update(link)
					.set({ contactId: keep.id })
					.where(
						inArray(
							link.id,
							movable.map((l) => l.id),
						),
					);
			}

			await logActivity([
				{
					actorUserId: ctx.user.id,
					entityType: "contact",
					entityId: keep.id,
					verb: "merged in",
					newValue: drop.name || drop.email || drop.id,
				},
				{
					actorUserId: ctx.user.id,
					entityType: "contact",
					entityId: drop.id,
					verb: "merged into",
					newValue: keep.name || keep.email || keep.id,
				},
			]);

			await reindexQuietly(() => indexContacts({ ids: [keep.id] }));

			return { keptId: keep.id, movedLinks: movable.length };
		}),

	/** "These two are different people." Stops the pair being offered again. */
	dismissDuplicate: protectedProcedure
		.input(z.object({ a: z.uuid(), b: z.uuid() }))
		.mutation(async ({ ctx, input }) => {
			const [contactA, contactB] =
				input.a < input.b ? [input.a, input.b] : [input.b, input.a];
			await ctx.db
				.insert(duplicateDismissal)
				.values({ contactA, contactB, createdBy: ctx.user.id })
				.onConflictDoNothing();
			return { dismissed: true };
		}),
});
