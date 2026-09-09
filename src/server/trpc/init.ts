import { db } from "@/db";
import { auth } from "@/lib/auth";
import { TRPCError, initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

/**
 * The session is resolved once per request and handed to every procedure.
 * There is no organization or tenant here: this dashboard has one audience,
 * and the only boundary is "signed in as somebody on the roster".
 */
export async function createTRPCContext(opts: { headers: Headers }) {
	const session = await auth()
		.api.getSession({ headers: opts.headers })
		.catch(() => null);

	return {
		headers: opts.headers,
		user: session?.user ?? null,
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
 * `protectedProcedure`, which is the app's entire authorization model.
 */
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
	if (!ctx.user) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Sign in again, your session expired.",
		});
	}
	return next({ ctx: { ...ctx, user: ctx.user } });
});
