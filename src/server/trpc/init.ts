import { db } from "@/db";
import { invitedUser } from "@/db/schema";
import { auth } from "@/lib/auth";
import { type Role, canManageUsers, isRole } from "@/lib/roles";
import { TRPCError, initTRPC } from "@trpc/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import superjson from "superjson";
import { ZodError } from "zod";

/**
 * The role behind a session, read from the roster on every request rather
 * than copied into the session when it was made, so changing somebody's
 * role takes effect on their next click and not their next sign-in. Null
 * when the address has no live invite, which the session hooks in
 * `lib/auth.ts` should already have prevented; a null here is refused
 * again below, because two doors are cheaper than one regret.
 */
async function roleFor(email: string): Promise<Role | null> {
	const rows = await db()
		.select({ role: invitedUser.role })
		.from(invitedUser)
		.where(
			and(
				eq(sql`lower(${invitedUser.email})`, email.trim().toLowerCase()),
				isNull(invitedUser.revokedAt),
			),
		)
		.limit(1);
	const role = rows[0]?.role;
	return isRole(role) ? role : null;
}

/**
 * The session is resolved once per request and handed to every procedure.
 * There is no organization or tenant here: this dashboard has one audience,
 * and the only boundaries are "signed in as somebody on the roster" and the
 * role that roster row carries.
 */
export async function createTRPCContext(opts: { headers: Headers }) {
	const session = await auth()
		.api.getSession({ headers: opts.headers })
		.catch(() => null);

	const user = session?.user ?? null;
	const role = user
		? await roleFor(user.email).catch((error: unknown) => {
				// Refused, not crashed: a lookup that fails reads as "not on the
				// list", which is the safe answer. Say why, or a missing column
				// looks exactly like a revoked invite from the sign-in page.
				console.error("Could not read the role for the session:", error);
				return null;
			})
		: null;

	return {
		headers: opts.headers,
		user,
		role,
		db: db(),
	};
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create({
	transformer: superjson,
	errorFormatter({ shape, error }) {
		return {
			...shape,
			data: {
				...shape.data,
				zod: error.cause instanceof ZodError ? error.cause.flatten() : null,
			},
		};
	},
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

/**
 * Public procedures are an exception that has to be argued for, and
 * `src/server/trpc/procedures.test.ts` holds the list of the ones that are.
 * Everything a signed-out browser cannot be allowed to call must be
 * `protectedProcedure`, `adminProcedure` or `ownerProcedure`, which between
 * them are the app's entire authorization model.
 */
export const publicProcedure = t.procedure;

/**
 * Anybody on the roster. A viewer gets the queries and none of the
 * mutations, decided here by the procedure's type rather than in each
 * mutation, so a new mutation is read-only for viewers without anybody
 * remembering to make it so.
 */
export const protectedProcedure = t.procedure.use(({ ctx, type, next }) => {
	if (!ctx.user) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Sign in again, your session expired.",
		});
	}
	if (!ctx.role) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "That account is not on the list.",
		});
	}
	if (type === "mutation" && ctx.role === "viewer") {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Viewers cannot make changes.",
		});
	}
	return next({ ctx: { ...ctx, user: ctx.user, role: ctx.role } });
});

/** Owners and admins: who can bring somebody in, and who can publish. */
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
	if (!canManageUsers(ctx.role)) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Only an admin can do that.",
		});
	}
	return next({ ctx });
});

/** Owners only: changing what somebody already on the roster is or can do. */
export const ownerProcedure = protectedProcedure.use(({ ctx, next }) => {
	if (ctx.role !== "owner") {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Only an owner can do that.",
		});
	}
	return next({ ctx });
});
