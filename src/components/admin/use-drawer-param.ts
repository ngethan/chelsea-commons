import { useNavigate, useSearch } from "@tanstack/react-router";

/**
 * Drawer open state, kept in the URL rather than in React state.
 *
 * The search param is the source of truth, never mirrored into state: two
 * copies of one fact desynchronise the first time something navigates from
 * somewhere unexpected. Keeping it in the URL is also what makes refresh keep
 * the drawer open, back close it, and a link to one record possible at all.
 *
 * `replace` so that opening and closing a drawer twenty times does not put
 * twenty entries between the reader and the page they came from.
 */
export function useDrawerParam(key: string) {
	const navigate = useNavigate();
	const search = useSearch({ strict: false }) as Record<string, unknown>;
	const raw = search[key];
	const value = typeof raw === "string" && raw ? raw : null;

	const open = (id: string) =>
		navigate({
			to: ".",
			search: (prev: Record<string, unknown>) => ({ ...prev, [key]: id }),
			replace: true,
		});

	const close = () =>
		navigate({
			to: ".",
			search: (prev: Record<string, unknown>) => {
				const next = { ...prev };
				delete next[key];
				return next;
			},
			replace: true,
		});

	return { value, open, close, isOpen: value !== null };
}
