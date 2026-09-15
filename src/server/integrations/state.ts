/**
 * The OAuth `state`: a random value sent to Google and kept in a cookie for
 * the few minutes the consent screen is open, then compared on return. It
 * is what stops a crafted callback link from attaching somebody else's
 * grant to the signed-in person. Random rather than signed, because an
 * attacker cannot set a cookie on this origin, so matching is enough.
 */

const COOKIE = "cc_integration_state";
const MAX_AGE = 10 * 60;

export function newState(): string {
	const bytes = new Uint8Array(24);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function stateCookie(state: string, secure: boolean): string {
	return [
		`${COOKIE}=${state}`,
		"Path=/api/integrations",
		"HttpOnly",
		"SameSite=Lax",
		`Max-Age=${MAX_AGE}`,
		secure ? "Secure" : "",
	]
		.filter(Boolean)
		.join("; ");
}

export function clearStateCookie(): string {
	return `${COOKIE}=; Path=/api/integrations; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function readState(request: Request): string | null {
	const header = request.headers.get("cookie") ?? "";
	for (const part of header.split(";")) {
		const [name, ...rest] = part.trim().split("=");
		if (name === COOKIE) return rest.join("=") || null;
	}
	return null;
}
