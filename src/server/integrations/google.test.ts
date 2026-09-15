import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	INTEGRATIONS,
	authorizationUrl,
	missingScopes,
	redirectUri,
} from "./google";
import { clearStateCookie, readState, stateCookie } from "./state";

const env = { ...process.env };

beforeEach(() => {
	process.env.GOOGLE_CLIENT_ID = "client-id";
	process.env.GOOGLE_CLIENT_SECRET = "client-secret";
	process.env.BETTER_AUTH_URL = "https://example.test";
});

afterEach(() => {
	process.env = { ...env };
});

describe("authorizationUrl", () => {
	it("asks for a refresh token every time, with the integration's scopes", () => {
		const url = new URL(authorizationUrl({ provider: "gmail", state: "abc" }));
		expect(url.origin + url.pathname).toBe(
			"https://accounts.google.com/o/oauth2/v2/auth",
		);
		expect(url.searchParams.get("client_id")).toBe("client-id");
		expect(url.searchParams.get("redirect_uri")).toBe(
			"https://example.test/api/integrations/gmail/callback",
		);
		expect(url.searchParams.get("scope")).toBe(
			INTEGRATIONS.gmail.scopes.join(" "),
		);
		// Without both, Google returns no refresh token and the grant dies in an hour.
		expect(url.searchParams.get("access_type")).toBe("offline");
		// The chooser first, so the default account is not assumed.
		expect(url.searchParams.get("prompt")).toBe("select_account consent");
		expect(url.searchParams.get("state")).toBe("abc");
		expect(url.searchParams.has("login_hint")).toBe(false);
	});

	it("refuses to build one without credentials", () => {
		process.env.GOOGLE_CLIENT_ID = "";
		expect(() => authorizationUrl({ provider: "gmail", state: "x" })).toThrow(
			/GOOGLE_CLIENT_ID/,
		);
	});
});

describe("redirectUri", () => {
	it("is built from the same base as sign-in", () => {
		expect(redirectUri("gmail")).toBe(
			"https://example.test/api/integrations/gmail/callback",
		);
	});
});

describe("missingScopes", () => {
	it("is empty when the grant covers what is asked for today", () => {
		expect(missingScopes("gmail", [...INTEGRATIONS.gmail.scopes])).toEqual([]);
	});

	it("lists what a narrower grant lacks, so the row can say reconnect", () => {
		expect(missingScopes("gmail", [])).toEqual(INTEGRATIONS.gmail.scopes);
	});

	it("ignores extra scopes Google folded in", () => {
		expect(
			missingScopes("gmail", [
				...INTEGRATIONS.gmail.scopes,
				"https://www.googleapis.com/auth/userinfo.email",
			]),
		).toEqual([]);
	});
});

describe("state cookie", () => {
	it("round-trips through a request's cookie header", () => {
		const cookie = stateCookie("s3cret", true);
		expect(cookie).toContain("HttpOnly");
		expect(cookie).toContain("Secure");
		const request = new Request("https://example.test/x", {
			headers: { cookie: `other=1; ${cookie.split(";")[0]}; more=2` },
		});
		expect(readState(request)).toBe("s3cret");
	});

	it("is absent when never set", () => {
		expect(readState(new Request("https://example.test/x"))).toBeNull();
	});

	it("clears with a zero max age", () => {
		expect(clearStateCookie()).toContain("Max-Age=0");
	});
});
