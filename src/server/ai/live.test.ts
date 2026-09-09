import { db } from "@/db";
import { user } from "@/db/schema";
import { runChat } from "@/server/ai/chat";
import { createCoreCaller } from "@/server/trpc/root";
import { describe, expect, it } from "vitest";

/**
 * One real turn against the real model and whatever database `DATABASE_URL`
 * points at, acting as the first user on the roster. Read-only unless the
 * prompt asks for a change, and even then it stops at the proposal: nothing
 * here presses Apply. Off by default because it costs money and needs keys:
 *
 *   LIVE_AI=1 node --env-file=.env.local node_modules/vitest/vitest.mjs run src/server/ai/live.test.ts
 *   LIVE_PROMPT="Who opened the last update?" ...
 */
describe.skipIf(process.env.LIVE_AI !== "1")("live", () => {
	it("answers a read-only question", { timeout: 240_000 }, async () => {
		const [u] = await db().select().from(user).limit(1);
		if (!u) throw new Error("no user row to act as");
		const ctx = { headers: new Headers(), user: u, db: db() };
		const tc = { ctx, caller: createCoreCaller(ctx) };
		const prompt =
			process.env.LIVE_PROMPT ?? "How are we doing? Keep it short.";
		const messages = [{ role: "user" as const, content: prompt }];
		let text = "";
		const log: string[] = [];
		for await (const ev of runChat({
			messages,
			tc,
			signal: new AbortController().signal,
		})) {
			if (ev.type === "text") {
				text += ev.text;
				continue;
			}
			if (ev.type === "thinking") continue;
			if (ev.type === "message") {
				log.push(
					`[message] ${ev.message.role}: ${Array.isArray(ev.message.content) ? ev.message.content.map((b) => b.type).join(",") : "text"}`,
				);
				continue;
			}
			if (ev.type === "tool_result") {
				log.push(
					`[tool_result] ok=${ev.ok} ${ev.summary} (${ev.content.length} chars)`,
				);
				continue;
			}
			if (ev.type === "proposal") {
				log.push(
					`[proposal] ${JSON.stringify(ev.proposal, null, 1).slice(0, 2500)}`,
				);
				continue;
			}
			log.push(`[${ev.type}] ${JSON.stringify(ev).slice(0, 300)}`);
		}
		console.log(log.join("\n"));
		console.log(`\n--- assistant ---\n${text}`);
		expect(log.some((l) => l.startsWith("[done]"))).toBe(true);
	});
});
