/**
 * A hue for somebody who has no picture, chosen from their id so it is the
 * same in every list, every drawer and every visit. Nine hues, evenly spread
 * and none of them red: the admin has no red anywhere, and a stranger's
 * initials must not read as an alarm. The ids are opaque (uuids for
 * contacts, auth ids for users), so a hash rather than a slice of the string.
 */
const HUES = [45, 85, 120, 150, 180, 210, 240, 270, 300] as const;

export function hueFor(id: string): number {
	let h = 2166136261;
	for (let i = 0; i < id.length; i++) {
		h ^= id.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return HUES[(h >>> 0) % HUES.length] as number;
}

/**
 * Berth's badge recipe, a deep fill under a pale ink of the same hue, at the
 * dark palette's lightnesses (`--darkest_*` and `--light_*` in `styles.css`).
 */
export function avatarColors(id: string) {
	const hue = hueFor(id);
	return {
		backgroundColor: `oklch(0.31 0.055 ${hue})`,
		color: `oklch(0.88 0.062 ${hue})`,
	};
}

/** Two letters from a name, or from an address when that is all there is. */
export function initialsFor(name?: string | null, email?: string | null) {
	const source = name?.trim() || email?.trim() || "";
	const parts = source.split(/[\s@._-]+/).filter(Boolean);
	return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}
