import { toast as sonner } from "sonner";

/**
 * Long enough to read the sentence twice. Errors get longer because they
 * usually ask for a decision, and they are the ones people re-read.
 *
 * sonner's own default is 4000ms for everything, and it has no per-type
 * duration, so the split lives here rather than on the Toaster.
 *
 * One caveat worth knowing: sonner announces its whole region as
 * `aria-live="polite"` and offers no way to mark one toast assertive, so an
 * error is announced politely rather than interrupting. The longer lifetime is
 * the compensation.
 */
const LIFETIME = { error: 7000, default: 5000 } as const;

export const toast = {
	success: (message: string) =>
		sonner.success(message, { duration: LIFETIME.default }),
	error: (message: string) =>
		sonner.error(message, { duration: LIFETIME.error }),
	info: (message: string) =>
		sonner.info(message, { duration: LIFETIME.default }),
	warning: (message: string) =>
		sonner.warning(message, { duration: LIFETIME.default }),
};
