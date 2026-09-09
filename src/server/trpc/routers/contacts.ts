import {
	activity,
	contact,
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
import { and, asc, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { fieldChanges, logActivity } from "../activity";
import { createTRPCRouter, protectedProcedure } from "../init";

const email = z.email("That is not an email address.").trim().toLowerCase();

const contactInput = z.object({
	name: z
		.string()
		.trim()
		.nullish()
		.transform((v) => v || null),
	email,
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
	notes: z
		.string()
		.trim()
		.nullish()
		.transform((v) => v || null),
});

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
				phone: contact.phone,
				status: contact.status,
				tags: contact.tags,
				createdAt: contact.createdAt,
				organizationId: contact.organizationId,
				organizationName: organization.name,
			})
			.from(contact)
			.leftJoin(organization, eq(organization.id, contact.organizationId))
			.where(isNull(contact.deletedAt))
			.orderBy(asc(contact.email));
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
			];

			entries.sort((a, b) => b.at.getTime() - a.at.getTime());
			return entries;
		}),

	create: protectedProcedure
		.input(contactInput)
		.mutation(async ({ ctx, input }) => {
			const [row] = await ctx.db
				.insert(contact)
				.values(input)
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
						"phone",
						"status",
						"tags",
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
				taken.add(row.email.toLowerCase());
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
});
