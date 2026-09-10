import { db } from "@/db";
import { activity } from "@/db/schema";

export type EntityType =
	| "contact"
	| "organization"
	| "update"
	| "link"
	| "invite"
	| "tag";

export type ActivityEntry = {
	actorUserId: string | null;
	entityType: EntityType;
	entityId: string;
	verb: string;
	field?: string | null;
	oldValue?: string | null;
	newValue?: string | null;
};

/**
 * Writes the log. Called by hand from the mutations that change something,
 * rather than diffed automatically underneath Drizzle: a generic differ
 * produces `updated_at changed from X to Y` and the rest of the project is
 * spent filtering its own noise back out.
 *
 * A logging failure must not undo the change it was describing, so this
 * swallows and reports rather than throwing.
 */
export async function logActivity(entries: ActivityEntry | ActivityEntry[]) {
	const rows = Array.isArray(entries) ? entries : [entries];
	if (rows.length === 0) return;

	try {
		await db()
			.insert(activity)
			.values(
				rows.map((row) => ({
					actorUserId: row.actorUserId,
					entityType: row.entityType,
					entityId: row.entityId,
					verb: row.verb,
					field: row.field ?? null,
					oldValue: row.oldValue ?? null,
					newValue: row.newValue ?? null,
				})),
			);
	} catch (err) {
		console.error("[activity] failed to write", err);
	}
}

function display(value: unknown): string | null {
	if (value === null || value === undefined) return null;
	if (Array.isArray(value)) return value.length ? value.join(", ") : null;
	if (value instanceof Date) return value.toISOString();
	return String(value);
}

/**
 * One entry per field that actually moved.
 *
 * The caller names the fields, so what gets logged stays a decision rather
 * than a side effect, but the comparison is not worth writing out fifteen
 * times.
 */
export function fieldChanges<T extends Record<string, unknown>>(
	base: Omit<ActivityEntry, "verb" | "field" | "oldValue" | "newValue">,
	before: T,
	after: Partial<T>,
	fields: Array<keyof T & string>,
): ActivityEntry[] {
	const entries: ActivityEntry[] = [];

	for (const field of fields) {
		if (!(field in after)) continue;
		const from = display(before[field]);
		const to = display(after[field]);
		if (from === to) continue;
		entries.push({
			...base,
			verb: "updated",
			field,
			oldValue: from,
			newValue: to,
		});
	}

	return entries;
}
