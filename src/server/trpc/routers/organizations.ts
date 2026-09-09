import { contact, organization } from "@/db/schema";
import {
	indexContacts,
	indexOrganizations,
	reindexQuietly,
} from "@/server/search";
import { TRPCError } from "@trpc/server";
import { and, asc, count, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { fieldChanges, logActivity } from "../activity";
import { createTRPCRouter, protectedProcedure } from "../init";

const orgInput = z.object({
	name: z.string().trim().min(1, "A name is required."),
	domain: z
		.string()
		.trim()
		.toLowerCase()
		.transform((v) => v.replace(/^@/, ""))
		.nullish()
		.transform((v) => v || null),
	notes: z
		.string()
		.trim()
		.nullish()
		.transform((v) => v || null),
});

export const organizationsRouter = createTRPCRouter({
	list: protectedProcedure.query(async ({ ctx }) => {
		const rows = await ctx.db
			.select({
				id: organization.id,
				name: organization.name,
				domain: organization.domain,
				notes: organization.notes,
				createdAt: organization.createdAt,
				contacts: count(contact.id),
			})
			.from(organization)
			.leftJoin(
				contact,
				and(
					eq(contact.organizationId, organization.id),
					isNull(contact.deletedAt),
				),
			)
			.groupBy(organization.id)
			.orderBy(asc(organization.name));

		return rows;
	}),

	byId: protectedProcedure
		.input(z.object({ id: z.uuid() }))
		.query(async ({ ctx, input }) => {
			const [row] = await ctx.db
				.select()
				.from(organization)
				.where(eq(organization.id, input.id))
				.limit(1);

			if (!row) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "No such organization.",
				});
			}

			const members = await ctx.db
				.select({
					id: contact.id,
					name: contact.name,
					email: contact.email,
					status: contact.status,
				})
				.from(contact)
				.where(
					and(eq(contact.organizationId, input.id), isNull(contact.deletedAt)),
				)
				.orderBy(asc(contact.email));

			return { organization: row, members };
		}),

	create: protectedProcedure
		.input(orgInput)
		.mutation(async ({ ctx, input }) => {
			const [row] = await ctx.db.insert(organization).values(input).returning();

			await logActivity({
				actorUserId: ctx.user.id,
				entityType: "organization",
				entityId: row.id,
				verb: "created",
			});

			await reindexQuietly(() => indexOrganizations({ ids: [row.id] }));

			return row;
		}),

	update: protectedProcedure
		.input(orgInput.partial().extend({ id: z.uuid() }))
		.mutation(async ({ ctx, input }) => {
			const { id, ...patch } = input;

			const [before] = await ctx.db
				.select()
				.from(organization)
				.where(eq(organization.id, id))
				.limit(1);

			if (!before) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "No such organization.",
				});
			}

			const [row] = await ctx.db
				.update(organization)
				.set({ ...patch, updatedAt: new Date() })
				.where(eq(organization.id, id))
				.returning();

			await logActivity(
				fieldChanges(
					{
						actorUserId: ctx.user.id,
						entityType: "organization",
						entityId: id,
					},
					before,
					patch,
					["name", "domain", "notes"],
				),
			);

			// Every member's document names the organization, so a rename
			// re-embeds the people as well. `indexContacts` skips the ones whose
			// text did not actually change.
			await reindexQuietly(async () => {
				await indexOrganizations({ ids: [id] });
				if (before.name !== row.name) {
					const members = await ctx.db
						.select({ id: contact.id })
						.from(contact)
						.where(eq(contact.organizationId, id));
					if (members.length)
						await indexContacts({ ids: members.map((m) => m.id) });
				}
			});

			return row;
		}),

	remove: protectedProcedure
		.input(z.object({ id: z.uuid() }))
		.mutation(async ({ ctx, input }) => {
			// Contacts survive: `organization_id` is `on delete set null`, so
			// removing an organization loosens people rather than deleting them.
			const members = await ctx.db
				.select({ id: contact.id })
				.from(contact)
				.where(eq(contact.organizationId, input.id));

			await ctx.db.delete(organization).where(eq(organization.id, input.id));

			await logActivity({
				actorUserId: ctx.user.id,
				entityType: "organization",
				entityId: input.id,
				verb: "deleted",
			});

			if (members.length) {
				await reindexQuietly(() =>
					indexContacts({ ids: members.map((m) => m.id) }),
				);
			}

			return { deleted: true };
		}),
});
