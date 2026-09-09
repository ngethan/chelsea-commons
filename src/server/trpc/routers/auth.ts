import { createTRPCRouter, publicProcedure } from "../init";

export const authRouter = createTRPCRouter({
	/**
	 * The one deliberately public procedure. `beforeLoad` on the admin layout
	 * calls it to decide whether to redirect, which by definition happens
	 * before anybody is signed in.
	 *
	 * It returns the session's own user and nothing else, so being public
	 * discloses only what the caller's own cookie already proves.
	 */
	session: publicProcedure.query(({ ctx }) =>
		ctx.user
			? {
					id: ctx.user.id,
					name: ctx.user.name,
					email: ctx.user.email,
					image: ctx.user.image ?? null,
				}
			: null,
	),
});
