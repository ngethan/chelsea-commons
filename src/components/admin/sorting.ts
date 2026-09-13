import { useNavigate, useSearch } from "@tanstack/react-router";

/**
 * Sorting a list by one of its date or number columns.
 *
 * The choice lives in the URL as `sort=<key>:<dir>`, beside the filters, so
 * a reload keeps it and a link carries it. Clicking a head goes newest or
 * largest first, then the other way, then back to the list's own order:
 * for a date or a count, "most" is the question being asked far more often
 * than "least", so it comes first.
 */

export type SortDir = "asc" | "desc";
export type Sort = { key: string; dir: SortDir } | null;

export function parseSort(raw: string | undefined): Sort {
	if (!raw) return null;
	const at = raw.lastIndexOf(":");
	if (at <= 0) return null;
	const key = raw.slice(0, at);
	const dir = raw.slice(at + 1);
	return dir === "asc" || dir === "desc" ? { key, dir } : null;
}

export function encodeSort(sort: Sort): string | undefined {
	return sort ? `${sort.key}:${sort.dir}` : undefined;
}

/** What the next click on `key` does: none → desc → asc → none. */
export function nextSort(current: Sort, key: string): Sort {
	if (current?.key !== key) return { key, dir: "desc" };
	return current.dir === "desc" ? { key, dir: "asc" } : null;
}

/** The `sort` search param, and a way to cycle it for a column. */
export function useSort() {
	const navigate = useNavigate();
	const search = useSearch({ strict: false }) as Record<string, unknown>;
	const raw = search.sort;
	const sort = parseSort(typeof raw === "string" ? raw : undefined);

	const toggle = (key: string) =>
		navigate({
			to: ".",
			search: (prev: Record<string, unknown>) => ({
				...prev,
				sort: encodeSort(nextSort(sort, key)),
			}),
			replace: true,
		});

	/** For a head: where this column stands, and what a click does. */
	const on = (key: string) => ({
		dir: sort?.key === key ? sort.dir : null,
		onToggle: () => toggle(key),
	});

	return { sort, toggle, on };
}

type Sortable = number | string | Date | null | undefined;

/**
 * The rows in `sort`'s order, or as given when there is none. Empty values
 * go last either way: a person never touched is not "least recently
 * touched", they are off the scale.
 */
export function sortRows<T>(
	rows: T[],
	sort: Sort,
	accessors: Record<string, (row: T) => Sortable>,
): T[] {
	if (!sort) return rows;
	const read = accessors[sort.key];
	if (!read) return rows;
	const sign = sort.dir === "asc" ? 1 : -1;
	const value = (row: T): number | string | null => {
		const v = read(row);
		if (v === null || v === undefined || v === "") return null;
		if (v instanceof Date) return v.getTime();
		if (typeof v === "string" && Number.isNaN(Number(v))) {
			const t = Date.parse(v);
			return Number.isNaN(t) ? v : t;
		}
		return typeof v === "string" ? Number(v) : v;
	};
	return rows
		.map((row, index) => ({ row, index, v: value(row) }))
		.sort((a, b) => {
			if (a.v === null && b.v === null) return a.index - b.index;
			if (a.v === null) return 1;
			if (b.v === null) return -1;
			const c = a.v < b.v ? -1 : a.v > b.v ? 1 : 0;
			return c === 0 ? a.index - b.index : c * sign;
		})
		.map((x) => x.row);
}
