"use client";

import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * The admin's toasts.
 *
 * `unstyled` is what makes this work: it puts `data-styled="false"` on every
 * toast, and all of sonner's own box styling is scoped to `data-styled='true'`,
 * so none of it applies and the rules in `styles.css` are not fighting the
 * library. What is left of sonner is the queue, the stacking, swipe to dismiss,
 * pause on hover, and the enter and exit transforms, which is the part worth
 * taking from a library.
 *
 * It is also the scope: the public site raises its own toast through
 * `toast.custom` on a plain Toaster, so its toasts stay `data-styled="true"`
 * and match none of the admin's styling.
 */
export function Toaster(props: ToasterProps) {
	return (
		<Sonner
			position="bottom-right"
			offset={20}
			gap={8}
			visibleToasts={4}
			closeButton
			toastOptions={{ unstyled: true }}
			icons={{
				success: <CircleCheck className="size-4" />,
				info: <Info className="size-4" />,
				warning: <TriangleAlert className="size-4" />,
				error: <CircleAlert className="size-4" />,
			}}
			{...props}
		/>
	);
}
