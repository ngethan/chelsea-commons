import { invitedUser, session, user } from "@/db/schema";
import { DEFAULT_ROLE, ROLES, assignableRoles } from "@/lib/roles";
import { TRPCError } from "@trpc/server";
import { asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { logActivity } from "../activity";
import {
	adminProcedure,
	createTRPCRouter,
	ownerProcedure,
	protectedProcedure,
} from "../init";

const email = z.email("That is not an email address.").trim().toLowerCase();
const role = z.enum(ROLES);

/**
 * Who can sign in, and as what.
 *
 * The roster is `invited_user`: one live row per address, carrying a role.
 * Reading it is for everybody (the POC picker and the assistant need the
 * names). Inviting is for owners and admins, and an admin can only hand out
 * member or viewer. Changing somebody already on it (their role, their
 * access) is for owners. Two rules keep the house from locking itself out:
 * nobody can revoke their own row, and nobody can change their own role, so
 * the owner doing the editing is still an owner afterwards.
 */
export const accessRouter = createTRPCRouter({
	/**
	 * Everybody with an account, for anything that points at a person in the
	 * house rather than a contact: the POC picker, the assistant's roster.
	 */
	users: protectedProcedure.query(async ({ ctx }) => {
		return ctx.db
			.select({
				id: user.id,
				name: user.name,
				email: user.email,
				image: user.image,
			})
			.from(user)
			.orderBy(asc(user.name));
	}),

	/**
	 * The roster, newest first. `signedInAt` is null for somebody invited
	 * who has never used the link, which is a state worth being able to see:
	 * it is the difference between "they cannot get in" and "they have not
	 * tried".
	 */
	list: protectedProcedure.query(async ({ ctx }) => {
		const rows = await ctx.db
			.select({
				id: invitedUser.id,
				email: invitedUser.email,
				role: invitedUser.role,
				createdAt: invitedUser.createdAt,
				revokedAt: invitedUser.revokedAt,
				userId: user.id,
				name: user.name,
				image: user.image,
				signedInAt: user.createdAt,
			})
			.from(invitedUser)
			.leftJoin(
				user,
				eq(sql`lower(${user.email})`, sql`lower(${invitedUser.email})`),
			)
			.orderBy(desc(invitedUser.createdAt));

		return rows.map((row) => ({
			...row,
			isYou: row.userId === ctx.user.id,
		}));
	}),

	invite: adminProcedure
		.input(z.object({ email, role: role.default(DEFAULT_ROLE) }))
		.mutation(async ({ ctx, input }) => {
			if (!assignableRoles(ctx.role).includes(input.role)) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only an owner can invite somebody as that.",
				});
			}

			// Re-inviting somebody withdrawn is ordinary, and the partial unique
			// index only covers live rows, so clear the old one rather than
			// leaving two rows for one address.
			await ctx.db
				.delete(invitedUser)
				.where(eq(sql`lower(${invitedUser.email})`, input.email));

			const [row] = await ctx.db
				.insert(invitedUser)
				.values({
					email: input.email,
					role: input.role,
					invitedBy: ctx.user.id,
				})
				.returning();

			await logActivity({
				actorUserId: ctx.user.id,
				entityType: "invite",
				entityId: row.id,
				verb: "invited",
				newValue: `${row.email} (${row.role})`,
			});

			return row;
		}),

	/**
	 * Changes what somebody can do, from their next request. The role is read
	 * from this row on every call, so there is no session to refresh.
	 */
	setRole: ownerProcedure
		.input(z.object({ id: z.uuid(), role }))
		.mutation(async ({ ctx, input }) => {
			const [row] = await ctx.db
				.select()
				.from(invitedUser)
				.where(eq(invitedUser.id, input.id))
				.limit(1);

			if (!row) {
				throw new TRPCError({ code: "NOT_FOUND", message: "No such invite." });
			}

			if (row.email.toLowerCase() === ctx.user.email.toLowerCase()) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "That is your own role. Have another owner change it.",
				});
			}

			if (row.role === input.role) return row;

			const [updated] = await ctx.db
				.update(invitedUser)
				.set({ role: input.role })
				.where(eq(invitedUser.id, input.id))
				.returning();

			await logActivity({
				actorUserId: ctx.user.id,
				entityType: "invite",
				entityId: row.id,
				verb: "updated",
				field: "role",
				oldValue: row.role,
				newValue: input.role,
			});

			return updated;
		}),

	/**
	 * Withdraws access and ends any session that address is holding, so it
	 * takes effect now rather than whenever the cookie would have expired.
	 */
	revoke: ownerProcedure
		.input(z.object({ id: z.uuid() }))
		.mutation(async ({ ctx, input }) => {
			const [row] = await ctx.db
				.select()
				.from(invitedUser)
				.where(eq(invitedUser.id, input.id))
				.limit(1);

			if (!row) {
				throw new TRPCError({ code: "NOT_FOUND", message: "No such invite." });
			}

			if (row.email.toLowerCase() === ctx.user.email.toLowerCase()) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "That is your own account. Have somebody else remove you.",
				});
			}

			await ctx.db
				.update(invitedUser)
				.set({ revokedAt: new Date() })
				.where(eq(invitedUser.id, input.id));

			const [account] = await ctx.db
				.select({ id: user.id })
				.from(user)
				.where(eq(sql`lower(${user.email})`, row.email.toLowerCase()))
				.limit(1);

			if (account) {
				await ctx.db.delete(session).where(eq(session.userId, account.id));
			}

			await logActivity({
				actorUserId: ctx.user.id,
				entityType: "invite",
				entityId: row.id,
				verb: "revoked",
				oldValue: row.email,
			});

			return { revoked: true };
		}),

	restore: ownerProcedure
		.input(z.object({ id: z.uuid() }))
		.mutation(async ({ ctx, input }) => {
			const [row] = await ctx.db
				.update(invitedUser)
				.set({ revokedAt: null })
				.where(eq(invitedUser.id, input.id))
				.returning();

			if (!row) {
				throw new TRPCError({ code: "NOT_FOUND", message: "No such invite." });
			}

			await logActivity({
				actorUserId: ctx.user.id,
				entityType: "invite",
				entityId: row.id,
				verb: "restored",
				newValue: row.email,
			});

			return row;
		}),
});
