/**
 * Where somebody sits with us, and nothing else. What a person *is* (advisor,
 * fund investor, somebody we have hosted) goes in tags: those accumulate,
 * they are not stages you move between, and forcing both into one dropdown
 * means throwing one of them away every time they overlap.
 */
export const CONTACT_STATUSES = [
	"prospect",
	"in_conversation",
	"committed",
	"passed",
] as const;

export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export const STATUS_LABEL: Record<ContactStatus, string> = {
	prospect: "Prospect",
	in_conversation: "In conversation",
	committed: "Committed",
	passed: "Passed",
};

/** Anything unrecognised reads as `prospect`, which is the safe way to be wrong. */
export function normalizeStatus(
	value: string | null | undefined,
): ContactStatus {
	return CONTACT_STATUSES.includes(value as ContactStatus)
		? (value as ContactStatus)
		: "prospect";
}
