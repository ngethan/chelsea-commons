import { db, schema } from "@/db";
import { invitedUser, user } from "@/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { and, eq, isNull, sql } from "drizzle-orm";
import { NOT_INVITED } from "./auth-codes";

/** Where a rejected sign-in lands. The page reads `?error=` and toasts it. */
const ERROR_URL = "/sign-in";

/**
 * Is this address on the roster right now?
 *
 * Checked on every Google sign-in, not only the first: `validateUserInfo`
 * runs for `sign-in` as well as `create-user` when the method is OAuth, which
 * is what makes revoking an invite take effect at the next sign-in rather
 * than at session expiry.
 */
async function isInvited(email: string): Promise<boolean> {
	const rows = await db()
		.select({ id: invitedUser.id })
		.from(invitedUser)
		.where(
			and(
				eq(sql`lower(${invitedUser.email})`, email.trim().toLowerCase()),
				isNull(invitedUser.revokedAt),
			),
		)
		.limit(1);
	return rows.length > 0;
}

function createAuth() {
	const secret = process.env.BETTER_AUTH_SECRET;
	if (!secret && process.env.NODE_ENV === "production") {
		throw new Error("BETTER_AUTH_SECRET must be set in production.");
	}

	return betterAuth({
		database: drizzleAdapter(db(), {
			provider: "pg",
			schema,
			// Neon's HTTP driver has no transactions, which is what this codebase
			// uses everywhere else and wants to keep. Better Auth runs its
			// operations sequentially instead.
			transaction: false,
		}),
		secret: secret ?? "chelsea-commons-dev-secret-not-for-production",
		baseURL:
			process.env.BETTER_AUTH_URL ??
			(process.env.VERCEL_URL
				? `https://${process.env.VERCEL_URL}`
				: undefined) ??
			"http://localhost:3000",

		emailAndPassword: {
			enabled: true,
			// There is no way to ask for a reset: that needs a mail transport, and
			// this app deliberately sends no mail. A password is set by an admin.
			requireEmailVerification: false,
			minPasswordLength: 8,
		},

		socialProviders: {
			google: {
				clientId: process.env.GOOGLE_CLIENT_ID ?? "",
				clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
			},
		},

		user: {
			/**
			 * The whole of "signups are disabled". Better Auth will happily
			 * create an account for anybody holding a Google address, so the
			 * roster is enforced here, before the user row exists.
			 */
			validateUserInfo: async ({ user }) => {
				const email = typeof user.email === "string" ? user.email : "";
				if (await isInvited(email)) return;
				return {
					error: NOT_INVITED,
					errorDescription: "That account is not on the list.",
				};
			},
		},

		session: {
			expiresIn: 60 * 60 * 24 * 7,
			updateAge: 60 * 60 * 24,
		},

		databaseHooks: {
			session: {
				create: {
					/**
					 * The roster, enforced a second time.
					 *
					 * `validateUserInfo` above covers Google, because an OAuth
					 * sign-in re-presents the provider's identity every time. A
					 * returning email-and-password sign-in presents nothing new, so
					 * Better Auth does not re-validate it, and somebody whose invite
					 * was withdrawn would keep signing in forever. Every session
					 * starts here, so this is the one place that catches both.
					 */
					before: async (session) => {
						const rows = await db()
							.select({ email: user.email })
							.from(user)
							.where(eq(user.id, session.userId))
							.limit(1);

						const email = rows[0]?.email;
						if (email && (await isInvited(email))) return;

						throw new APIError("FORBIDDEN", {
							message: "That account is not on the list.",
							code: NOT_INVITED,
						});
					},
				},
			},
		},

		onAPIError: { errorURL: ERROR_URL },

		// Must stay last: it is what writes the session cookie onto the response.
		plugins: [tanstackStartCookies()],
	});
}

/**
 * Built on first use rather than at module load. `db()` throws without
 * DATABASE_URL, and this module is reachable from the route tree during the
 * prerender pass, where that variable is not necessarily set.
 */
let instance: ReturnType<typeof createAuth> | null = null;

export function auth() {
	if (!instance) {
		instance = createAuth();
	}
	return instance;
}

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];
