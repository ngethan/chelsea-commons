import { db } from "@/db";
import { integration } from "@/db/schema";
import { appBaseUrl } from "@/lib/auth";
import { and, eq } from "drizzle-orm";

/**
 * Google integrations: a person in the house grants this app access to one
 * of their Google products, and the grant is kept in `integration`, one row
 * per person per product.
 *
 * This is its own OAuth flow rather than Better Auth's `linkSocial`, for one
 * reason: Better Auth keeps a single `account` row per provider, and every
 * Google sign-in rewrites that row's tokens and scope. A mailbox grant
 * stored there would be gone after the next sign-in. Here the grant has its
 * own row, its own redirect URI, and its own scopes, and signing in touches
 * none of it.
 */

export const INTEGRATIONS = {
	gmail: {
		label: "Gmail",
		scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
	},
} as const;

export type Provider = keyof typeof INTEGRATIONS;

export const PROVIDERS = Object.keys(INTEGRATIONS) as Provider[];

export function isProvider(value: unknown): value is Provider {
	return typeof value === "string" && value in INTEGRATIONS;
}

/** What each scope means, for the drawer. Unknown scopes show as themselves. */
const SCOPE_LABEL: Record<string, string> = {
	"https://www.googleapis.com/auth/gmail.readonly": "Read mail",
};

export function scopeLabel(scope: string): string {
	return SCOPE_LABEL[scope] ?? scope;
}

/**
 * The scopes the integration asks for today that a grant does not carry.
 * Non-empty means the person has to connect again; that is how widening
 * `INTEGRATIONS[x].scopes` shows up on every existing row.
 */
export function missingScopes(provider: Provider, granted: string[]): string[] {
	return INTEGRATIONS[provider].scopes.filter((s) => !granted.includes(s));
}

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";

function credentials() {
	const clientId = process.env.GOOGLE_CLIENT_ID;
	const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
	if (!clientId || !clientSecret) {
		throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set.");
	}
	return { clientId, clientSecret };
}

/** Registered in the Google Cloud console, next to Better Auth's. */
export function redirectUri(provider: Provider): string {
	return `${appBaseUrl()}/api/integrations/${provider}/callback`;
}

/**
 * Where the browser goes to grant. `access_type=offline` and
 * `prompt=consent` together are what make Google return a refresh token,
 * and it returns one only on a consent screen, so the screen is forced
 * every time rather than only the first. `login_hint` preselects the
 * account they signed in with; they can still pick another.
 */
export function authorizationUrl(opts: {
	provider: Provider;
	state: string;
	loginHint?: string;
}): string {
	const { clientId } = credentials();
	const url = new URL(AUTH_URL);
	url.searchParams.set("client_id", clientId);
	url.searchParams.set("redirect_uri", redirectUri(opts.provider));
	url.searchParams.set("response_type", "code");
	url.searchParams.set("scope", INTEGRATIONS[opts.provider].scopes.join(" "));
	url.searchParams.set("access_type", "offline");
	url.searchParams.set("prompt", "consent");
	url.searchParams.set("include_granted_scopes", "true");
	url.searchParams.set("state", opts.state);
	if (opts.loginHint) url.searchParams.set("login_hint", opts.loginHint);
	return url.toString();
}

type TokenResponse = {
	access_token: string;
	expires_in: number;
	refresh_token?: string;
	scope?: string;
	token_type: string;
};

async function tokenRequest(
	body: Record<string, string>,
): Promise<TokenResponse> {
	const res = await fetch(TOKEN_URL, {
		method: "POST",
		headers: { "content-type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams(body),
	});
	const json = (await res.json().catch(() => null)) as
		| (TokenResponse & { error?: string; error_description?: string })
		| null;
	if (!res.ok || !json?.access_token) {
		throw new Error(
			`Google token endpoint: ${json?.error ?? res.status} ${json?.error_description ?? ""}`.trim(),
		);
	}
	return json;
}

/** The code from the callback, traded for tokens. */
export async function exchangeCode(provider: Provider, code: string) {
	const { clientId, clientSecret } = credentials();
	const tokens = await tokenRequest({
		code,
		client_id: clientId,
		client_secret: clientSecret,
		redirect_uri: redirectUri(provider),
		grant_type: "authorization_code",
	});
	if (!tokens.refresh_token) {
		// Google omits it when the consent screen was skipped, which
		// `prompt=consent` should prevent; without one the grant dies in an
		// hour, so refuse rather than store something that will not sync.
		throw new Error("Google did not return a refresh token.");
	}
	return {
		accessToken: tokens.access_token,
		accessTokenExpiresAt: expiry(tokens.expires_in),
		refreshToken: tokens.refresh_token,
		scopes: tokens.scope?.split(" ").filter(Boolean) ?? [],
	};
}

function expiry(seconds: number): Date {
	return new Date(Date.now() + seconds * 1000);
}

/** Tells Google to forget the grant. Idempotent: an already-dead token is a 200 too. */
export async function revoke(token: string): Promise<void> {
	const res = await fetch(REVOKE_URL, {
		method: "POST",
		headers: { "content-type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({ token }),
	});
	// 400 is "invalid_token": already revoked, or expired. Nothing to keep.
	if (!res.ok && res.status !== 400) {
		throw new Error(`Google revoke endpoint returned ${res.status}.`);
	}
}

/**
 * Which mailbox granted. With `gmail.readonly` the profile call is the
 * cheapest proof the grant works, and it names the account, which need not
 * be the one they sign in with.
 */
export async function gmailProfile(accessToken: string) {
	const res = await fetch(
		"https://gmail.googleapis.com/gmail/v1/users/me/profile",
		{ headers: { authorization: `Bearer ${accessToken}` } },
	);
	if (!res.ok) throw new Error(`Gmail profile returned ${res.status}.`);
	return (await res.json()) as {
		emailAddress: string;
		messagesTotal: number;
		threadsTotal: number;
		historyId: string;
	};
}

/**
 * A live access token for somebody's grant, for whatever reads on their
 * behalf. Refreshes when within a minute of expiry and writes the new token
 * back, so the next caller does not refresh again. Null when they have not
 * connected.
 */
export async function accessTokenFor(
	userId: string,
	provider: Provider,
): Promise<string | null> {
	const [row] = await db()
		.select()
		.from(integration)
		.where(
			and(eq(integration.userId, userId), eq(integration.provider, provider)),
		)
		.limit(1);
	if (!row) return null;

	const fresh =
		row.accessToken &&
		row.accessTokenExpiresAt &&
		row.accessTokenExpiresAt.getTime() - Date.now() > 60_000;
	if (fresh) return row.accessToken;

	const { clientId, clientSecret } = credentials();
	const tokens = await tokenRequest({
		refresh_token: row.refreshToken,
		client_id: clientId,
		client_secret: clientSecret,
		grant_type: "refresh_token",
	});
	await db()
		.update(integration)
		.set({
			accessToken: tokens.access_token,
			accessTokenExpiresAt: expiry(tokens.expires_in),
			updatedAt: new Date(),
		})
		.where(eq(integration.id, row.id));
	return tokens.access_token;
}
