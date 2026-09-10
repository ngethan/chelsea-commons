import { invitedUser, session, user } from "@/db/schema";
import { TRPCError } from "@trpc/server";
import { asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { logActivity } from "../activity";
import { createTRPCRouter, protectedProcedure } from "../init";

const email = z.email("That is not an email address.").trim().toLowerCase();

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
	 * The roster, live rows first. `signedInAt` is null for somebody invited
	 * who has never used the link, which is a state worth being able to see:
	 * it is the difference between "they cannot get in" and "they have not
	 * tried".
	 */
	list: protectedProcedure.query(async ({ ctx }) => {
		const rows = await ctx.db
			.select({
				id: invitedUser.id,
				email: invitedUser.email,
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

	invite: protectedProcedure
		.input(z.object({ email }))
		.mutation(async ({ ctx, input }) => {
			// Re-inviting somebody withdrawn is ordinary, and the partial unique
			// index only covers live rows, so clear the old one rather than
			// leaving two rows for one address.
			await ctx.db
				.delete(invitedUser)
				.where(eq(sql`lower(${invitedUser.email})`, input.email));

			const [row] = await ctx.db
				.insert(invitedUser)
				.values({ email: input.email, invitedBy: ctx.user.id })
				.returning();

			await logActivity({
				actorUserId: ctx.user.id,
				entityType: "invite",
				entityId: row.id,
				verb: "invited",
				newValue: row.email,
			});

			return row;
		}),

	/**
	 * Withdraws access and ends any session that address is holding, so it
	 * takes effect now rather than whenever the cookie would have expired.
	 */
	revoke: protectedProcedure
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
					message:
						"That is your own account, and Google is the only door. Have somebody else remove you.",
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

	restore: protectedProcedure
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
