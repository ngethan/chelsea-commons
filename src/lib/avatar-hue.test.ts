import { describe, expect, it } from "vitest";
import { avatarColors, hueFor, initialsFor } from "./avatar-hue";

describe("hueFor", () => {
	it("is the same hue for the same id", () => {
		const id = "6f1c2a3e-1b2c-4d5e-8f90-abcdef123456";
		expect(hueFor(id)).toBe(hueFor(id));
	});

	it("never lands on red", () => {
		for (let i = 0; i < 500; i++) {
			const hue = hueFor(`id-${i}`);
			expect(hue).toBeGreaterThanOrEqual(45);
			expect(hue).toBeLessThanOrEqual(300);
		}
	});

	it("spreads ids across the hues", () => {
		const seen = new Set<number>();
		for (let i = 0; i < 200; i++) seen.add(hueFor(`id-${i}`));
		expect(seen.size).toBe(9);
	});
});

describe("avatarColors", () => {
	it("is a deep fill under a pale ink of one hue", () => {
		const { backgroundColor, color } = avatarColors("x");
		expect(backgroundColor).toMatch(/^oklch\(0\.31 /);
		expect(color).toMatch(/^oklch\(0\.88 /);
		const hue = (c: string) => c.split(" ").at(-1);
		expect(hue(backgroundColor)).toBe(hue(color));
	});
});

describe("initialsFor", () => {
	it("takes the first two words of a name", () => {
		expect(initialsFor("Ada Lovelace")).toBe("AL");
		expect(initialsFor("ada")).toBe("A");
	});

	it("falls back to the address", () => {
		expect(initialsFor(null, "ada.lovelace@example.com")).toBe("AL");
		expect(initialsFor("", "ada@example.com")).toBe("AE");
	});

	it("is empty with nothing to go on", () => {
		expect(initialsFor(null, null)).toBe("");
	});
});
