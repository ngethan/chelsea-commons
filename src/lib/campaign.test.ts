import { describe, expect, it } from "vitest";
import { renderCampaignEmail, renderCampaignText } from "./campaign";

const opts = {
	ref: "ab3k9xz2",
	name: "Coyne",
	baseUrl: "https://chelseacommons.co",
	description: "What we did this month",
};

describe("campaign email", () => {
	it("renders the same prose in both parts", () => {
		const html = renderCampaignEmail(opts);
		const text = renderCampaignText(opts);
		for (const line of [
			"Hi Coyne,",
			"What we did this month.",
			"in our corner",
		]) {
			expect(html).toContain(line);
			expect(text).toContain(line);
		}
	});

	it("carries no styling at all", () => {
		const html = renderCampaignEmail(opts);
		expect(html).not.toMatch(/style=|<style|class=|font-|<html|<body/);
	});

	it("puts the tracked link in both parts and the pixel only in html", () => {
		const html = renderCampaignEmail(opts);
		const text = renderCampaignText(opts);
		expect(html).toContain('href="https://chelseacommons.co/u/ab3k9xz2"');
		expect(text).toContain("https://chelseacommons.co/u/ab3k9xz2");
		expect(html).toContain("/api/open/ab3k9xz2");
		expect(text).not.toContain("/api/open/");
	});

	it("describes the post it is sending, not a fixed one", () => {
		const other = renderCampaignText({
			...opts,
			description: "a later update",
		});
		expect(other).toContain("a later update");
		expect(other).not.toContain("what we did this month");
	});

	it("falls back to a generic greeting without a name", () => {
		expect(renderCampaignText({ ...opts, name: null })).toContain("Hi,");
	});
});
