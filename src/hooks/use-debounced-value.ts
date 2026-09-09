import { useEffect, useState } from "react";

/** The value as it was `delay` ms ago, for anything that costs a request. */
export function useDebouncedValue<T>(value: T, delay = 250): T {
	const [debounced, setDebounced] = useState(value);

	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(timer);
	}, [value, delay]);

	return debounced;
}
