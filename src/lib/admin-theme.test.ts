import { describe, expect, it } from "vitest";
import { isAdminPath } from "./admin-theme";

describe("isAdminPath", () => {
	it("is dark across the admin and its door", () => {
		expect(isAdminPath("/admin")).toBe(true);
		expect(isAdminPath("/admin/writing")).toBe(true);
		expect(isAdminPath("/admin/settings/users")).toBe(true);
		expect(isAdminPath("/sign-in")).toBe(true);
	});

	it("is light on the public site", () => {
		expect(isAdminPath("/")).toBe(false);
		expect(isAdminPath("/writing")).toBe(false);
		expect(isAdminPath("/writing/raising-a-fund")).toBe(false);
	});

	/**
	 * The preview lives at an admin address and is not the admin. It renders
	 * the reading page, and the reading page is cream: in the admin's palette
	 * it would be a preview of something nobody is ever shown.
	 */
	it("is light for a post preview, despite its address", () => {
		expect(isAdminPath("/admin/writing/abc-123/preview")).toBe(false);
	});

	it("does not let anything else under that path go light", () => {
		expect(isAdminPath("/admin/writing/abc-123")).toBe(true);
		expect(isAdminPath("/admin/writing/abc-123/recipients")).toBe(true);
		expect(isAdminPath("/admin/writing/abc-123/preview/deeper")).toBe(true);
	});
});
