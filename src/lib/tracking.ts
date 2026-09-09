import { randomBytes } from "node:crypto";
import { db } from "@/db";
import { link, linkEvent, update } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";

/** Unambiguous alphabet: no 0/O/1/l/I, so a ref survives being read aloud. */
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function newRef(length = 8) {
	const bytes = randomBytes(length);
	let out = "";
	for (let i = 0; i < length; i++) {
		out += ALPHABET[bytes[i] % ALPHABET.length];
	}
	return out;
}

/**
 * The route is /u/$ref, so the router always supplies the param; the pathname
 * fallback is belt-and-braces for a handler invoked outside the router.
 */
export function refFrom(
	params: { ref?: string } | undefined,
	request: Request,
): string {
	return params?.ref ?? new URL(request.url).pathname.split("/").pop() ?? "";
}

function clientIp(request: Request) {
	return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}

/**
 * Resolves a ref to the post slug it was addressed to, recording the click.
 *
 * Returns null for a ref that is unknown, malformed, or revoked. The caller
 * answers all three identically, so a revoked link cannot be told apart from
 * one that never existed by whoever is still holding it.
 *
 * Every hit is stored, including the ones that are plainly a scanner. Which
 * hits count is decided where the numbers are read, by `isAutomatedClick`:
 * a filter applied here would throw away the evidence it was guessing from.
 */
export async function resolveRef(ref: string): Promise<string | null> {
	if (!ref) return null;
	const rows = await db()
		.select({ slug: update.slug })
		.from(link)
		.innerJoin(update, eq(update.id, link.updateId))
		.where(and(eq(link.ref, ref), isNull(link.revokedAt)))
		.limit(1);
	return rows[0]?.slug ?? null;
}

export async function recordClick(
	ref: string,
	request: Request,
): Promise<string | null> {
	try {
		const slug = await resolveRef(ref);
		if (!slug) return null;

		await db()
			.insert(linkEvent)
			.values({
				ref,
				kind: "click",
				userAgent: request.headers.get("user-agent"),
				ip: clientIp(request),
			});

		return slug;
	} catch (err) {
		// Never let a tracking failure strand the reader on an error page.
		console.error("[tracking] failed to record click", err);
		return null;
	}
}
