export type Recipient = { email: string; name: string | null };

const EMAIL_RE = /^[^\s@,<>]+@[^\s@,<>]+\.[^\s@,<>]+$/;

/**
 * Accepts the three shapes people actually paste out of a spreadsheet or an
 * address book, one per line:
 *   jane@example.com
 *   Jane Doe <jane@example.com>
 *   Jane Doe, jane@example.com
 * Later duplicates of the same address are dropped so nobody gets two copies.
 */
export function parseRecipients(input: string): {
	recipients: Recipient[];
	invalid: string[];
} {
	const recipients: Recipient[] = [];
	const invalid: string[] = [];
	const seen = new Set<string>();

	for (const rawLine of input.split(/[\r\n]+/)) {
		const line = rawLine.trim();
		if (!line) continue;

		let name: string | null = null;
		let email: string | null = null;

		const angled = line.match(/^(.*?)<([^>]+)>\s*$/);
		if (angled) {
			name = angled[1].trim().replace(/^["']|["']$/g, "") || null;
			email = angled[2].trim();
		} else if (line.includes(",")) {
			const parts = line.split(",").map((p) => p.trim());
			const emailPart = parts.find((p) => EMAIL_RE.test(p));
			if (emailPart) {
				email = emailPart;
				name =
					parts
						.filter((p) => p !== emailPart)
						.join(" ")
						.trim() || null;
			}
		} else {
			email = line;
		}

		if (!email || !EMAIL_RE.test(email)) {
			invalid.push(line);
			continue;
		}

		const key = email.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		recipients.push({ email, name });
	}

	return { recipients, invalid };
}
