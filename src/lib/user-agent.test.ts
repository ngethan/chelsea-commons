import { describe, expect, it } from "vitest";
import { describeAgent } from "./user-agent";

describe("describeAgent", () => {
	it("names desktop Chrome on a Mac", () => {
		expect(
			describeAgent(
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
			),
		).toBe("Chrome on Mac");
	});

	it("does not mistake Safari's token in Chrome for Safari", () => {
		expect(
			describeAgent(
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 Edg/128.0",
			),
		).toBe("Edge on Windows");
	});

	it("names Safari on an iPhone", () => {
		expect(
			describeAgent(
				"Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
			),
		).toBe("Safari on iPhone");
	});

	it("says nothing rather than guessing at a scanner", () => {
		expect(describeAgent("curl/8.4.0")).toBe("");
		expect(describeAgent(null)).toBe("");
	});
});
