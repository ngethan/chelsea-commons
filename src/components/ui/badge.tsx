import { cn } from "@/lib/utils";
import type * as React from "react";

/**
 * Status, in a closed set of tones so the palette stays honest: the accent,
 * the pipeline green and amber, and neutral. No red: a badge never carries
 * an alarm here, and no `color` prop.
 *
 * A fill and no border. The wash-inside-an-outline version stated the tone
 * twice, and on a dark ground the outline did most of the work, so a badge
 * read as a frame with something faint in it.
 */
type Tone = "neutral" | "primary" | "success" | "warning";

const TONE: Record<Tone, string> = {
	neutral: "bg-secondary text-foreground",
	primary: "bg-darkest_primary text-light_primary",
	success: "bg-darkest_success text-light_success",
	warning: "bg-darkest_warning text-light_warning",
};

function Badge({
	className,
	tone = "neutral",
	...props
}: React.ComponentProps<"span"> & { tone?: Tone }) {
	return (
		<span
			data-slot="badge"
			data-tone={tone}
			className={cn(
				"inline-flex h-5 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-none px-2 text-[11px] font-medium leading-none",
				TONE[tone],
				className,
			)}
			{...props}
		/>
	);
}

export { Badge };
export type { Tone };
