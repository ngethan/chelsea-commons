import { randomBytes } from "node:crypto";
import { db, ensureSchema } from "./db";

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
 * The route is /u/$ref and /api/open/$ref, so the router always supplies the
 * param; the pathname fallback is belt-and-braces for a handler invoked
 * outside the router. One home for it rather than a copy in each route.
 */
export function refFrom(
	params: { ref?: string } | undefined,
	request: Request,
): string {
	return params?.ref ?? new URL(request.url).pathname.split("/").pop() ?? "";
}

function clientIp(request: Request) {
	const forwarded = request.headers.get("x-forwarded-for");
	return forwarded?.split(",")[0]?.trim() || null;
}

/**
 * Records one event and reports where that ref was addressed to.
 *
 * The insert selects from email_sends rather than checking the ref first, so
 * an unknown ref inserts no row and comes back empty in a single round trip.
 * Both callers sit in front of something a recipient is waiting on, so the
 * saved trip is worth the slightly denser SQL.
 *
 * Gmail and Outlook proxy images through their own fetchers, which is why an
 * open can fire seconds after a send with a Google user agent. Every hit is
 * recorded and the dashboard shows the user agent, rather than guessing here
 * which hits are people.
 */
async function record(
	kind: "open" | "click",
	ref: string,
	request: Request,
): Promise<string | null> {
	await ensureSchema();
	const sql = db();

	const rows = (await sql`
		insert into email_events (ref, kind, target, user_agent, ip)
		select
			s.ref,
			${kind},
			case when ${kind} = 'click' then s.destination else null end,
			${request.headers.get("user-agent")},
			${clientIp(request)}
		from email_sends s
		where s.ref = ${ref}
		returning target
	`) as Array<{ target: string | null }>;

	return rows[0]?.target ?? null;
}

export async function recordOpen(ref: string, request: Request) {
	try {
		await record("open", ref, request);
	} catch (err) {
		// A tracking failure must never break the pixel.
		console.error("[tracking] failed to record open", err);
	}
}

/** Returns null for an unknown ref; the caller decides where to send those. */
export async function recordClick(
	ref: string,
	request: Request,
): Promise<string | null> {
	try {
		return await record("click", ref, request);
	} catch (err) {
		// Never let a tracking failure strand the reader on an error page.
		console.error("[tracking] failed to record click", err);
		return null;
	}
}
