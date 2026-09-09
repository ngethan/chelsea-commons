import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The app's whole authorization model is "everything is `protectedProcedure`",
 * so the failure mode is somebody adding an endpoint and reaching for the
 * wrong one. That is a one-word mistake in a file nobody reads twice, and it
 * exposes a list of investors to the internet.
 *
 * This reads the source rather than the router object because the router's
 * runtime shape does not say which procedure built it.
 */
const ROUTERS = join(import.meta.dirname, "routers");

/**
 * The public procedures, and the argument for each. Adding to this list should
 * feel like a decision, which is the point of the list existing.
 */
const ALLOWED_PUBLIC = new Map([
	[
		"auth.ts:session",
		"Called by the admin layout's beforeLoad to decide whether to redirect, which by definition runs before anybody is signed in. Returns the caller's own user or null, so it discloses only what their cookie already proves.",
	],
]);

/** `\tname: someProcedure` at the top level of a router literal. */
const PROCEDURE = /^\t(\w+): (\w+Procedure)\b/gm;

function procedures() {
	const found: Array<{ file: string; name: string; kind: string }> = [];

	for (const file of readdirSync(ROUTERS).filter((f) => f.endsWith(".ts"))) {
		const source = readFileSync(join(ROUTERS, file), "utf8");
		for (const match of source.matchAll(PROCEDURE)) {
			found.push({ file, name: match[1], kind: match[2] });
		}
	}

	return found;
}

describe("tRPC procedures", () => {
	it("finds the routers at all", () => {
		// Guards against the regex quietly matching nothing after a refactor,
		// which would make every assertion below pass for the wrong reason.
		expect(procedures().length).toBeGreaterThan(10);
	});

	it("uses only procedures this app defines", () => {
		for (const procedure of procedures()) {
			expect(
				["publicProcedure", "protectedProcedure"],
				`${procedure.file}:${procedure.name}`,
			).toContain(procedure.kind);
		}
	});

	it("keeps every endpoint behind a session unless it is argued for", () => {
		const unexplained = procedures()
			.filter((p) => p.kind === "publicProcedure")
			.filter((p) => !ALLOWED_PUBLIC.has(`${p.file}:${p.name}`))
			.map((p) => `${p.file}:${p.name}`);

		expect(unexplained).toEqual([]);
	});

	it("has no stale entries in the allowlist", () => {
		const live = new Set(
			procedures()
				.filter((p) => p.kind === "publicProcedure")
				.map((p) => `${p.file}:${p.name}`),
		);

		for (const key of ALLOWED_PUBLIC.keys()) {
			expect(live, `${key} is allowlisted but no longer public`).toContain(key);
		}
	});
});
