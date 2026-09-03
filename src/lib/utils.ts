import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/** Errors cross the server-function boundary as Error or as anything at all. */
export function errorText(err: unknown) {
	return err instanceof Error ? err.message : String(err);
}
