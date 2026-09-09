import { cn } from "@/lib/utils";
import type * as React from "react";

/**
 * Square, one border weight, and a brighter border on focus rather than a
 * ring: the ring is a second shape drawn around a control that already has
 * one. The fill stays put on focus so the field does not appear to move.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
	return (
		<input
			type={type}
			data-slot="input"
			className={cn(
				"h-9 w-full min-w-0 rounded-none border border-input bg-card px-3 py-1 text-[14px] text-foreground outline-none transition-colors",
				"placeholder:text-muted-foreground/70",
				"focus-visible:border-input-focus",
				"disabled:cursor-not-allowed disabled:opacity-60",
				"aria-invalid:border-destructive",
				className,
			)}
			{...props}
		/>
	);
}

export { Input };
