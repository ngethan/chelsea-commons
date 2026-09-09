import { cn } from "@/lib/utils";
import type * as React from "react";

/**
 * Status, in a closed set of tones so the palette stays honest: the accent,
 * the pipeline green and amber, and neutral. No red: a badge never carries
 * an alarm here, and no `color` prop.
 *
 * A pill: a fill and no border. Badges and chips are the one family here
 * that is fully round, the way Ramp's are, because they are labels that
 * sit *on* a row rather than controls that sit *in* the page.
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
				"inline-flex h-[22px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11px] font-medium leading-none",
				TONE[tone],
				className,
			)}
			{...props}
		/>
	);
}

export { Badge };
export type { Tone };
