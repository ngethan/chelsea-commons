/**
 * Shared secret for every server function that can send mail or read the
 * recipient list. It lives in one module so a new admin endpoint has an
 * obvious thing to call: forgetting it is silent, and the endpoints it guards
 * can send mail from the project's own domain.
 */
export function assertAdmin(password: string) {
	const expected = process.env.ADMIN_PASSWORD;
	if (!expected) {
		throw new Error(
			"ADMIN_PASSWORD is not set. Add it to .env.local and to the Vercel project env.",
		);
	}
	if (password !== expected) {
		throw new Error("Wrong password.");
	}
}
