import { describe, expect, it } from "vitest";
import { isAutomatedClick, isPrefetch } from "./bots";

describe("isAutomatedClick", () => {
	it("counts an ordinary browser", () => {
		expect(
			isAutomatedClick(
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
			),
		).toBe(false);
		expect(
			isAutomatedClick(
				"Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
			),
		).toBe(false);
	});

	it("does not count link unfurlers", () => {
		for (const agent of [
			"Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
			"Twitterbot/1.0",
			"facebookexternalhit/1.1",
			"WhatsApp/2.19.81 A",
			"Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)",
			"LinkedInBot/1.0 (compatible; Mozilla/5.0; Jakarta Commons-HttpClient/3.1)",
		]) {
			expect(isAutomatedClick(agent), agent).toBe(true);
		}
	});

	it("does not count mail scanners and proxies", () => {
		for (const agent of [
			"Mozilla/5.0 (compatible; ProofpointURLDefense)",
			"Mimecast MTA",
			"Mozilla/5.0 (Windows NT 10.0) Microsoft Office Word 2016",
			"Mozilla/5.0 (compatible; GoogleImageProxy; +http://www.google.com/)",
		]) {
			expect(isAutomatedClick(agent), agent).toBe(true);
		}
	});

	it("does not count scripted fetches", () => {
		for (const agent of [
			"curl/8.7.1",
			"Wget/1.21.4",
			"python-requests/2.32.3",
			"node-fetch/1.0",
			"Mozilla/5.0 HeadlessChrome/131.0.0.0",
		]) {
			expect(isAutomatedClick(agent), agent).toBe(true);
		}
	});

	it("does not count a missing user agent", () => {
		// A browser sending none is rare; a script sending none is not. Not
		// counting it is the better mistake, since the raw event is still stored.
		expect(isAutomatedClick(null)).toBe(true);
		expect(isAutomatedClick("")).toBe(true);
		expect(isAutomatedClick("   ")).toBe(true);
	});
});

describe("isPrefetch", () => {
	const request = (headers: Record<string, string>) =>
		new Request("https://chelseacommons.co/u/abc", { headers });

	it("recognises a warmed link", () => {
		expect(isPrefetch(request({ "sec-purpose": "prefetch" }))).toBe(true);
		expect(isPrefetch(request({ "sec-purpose": "prefetch;prerender" }))).toBe(
			true,
		);
		expect(isPrefetch(request({ purpose: "prefetch" }))).toBe(true);
		expect(isPrefetch(request({ "x-purpose": "preview" }))).toBe(true);
	});

	it("leaves an ordinary request alone", () => {
		expect(isPrefetch(request({}))).toBe(false);
		expect(isPrefetch(request({ "sec-fetch-mode": "navigate" }))).toBe(false);
	});
});
