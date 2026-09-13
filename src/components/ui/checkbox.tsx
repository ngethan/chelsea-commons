"use client";

import { Check } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The one control in the page with a radius: 3px, enough to read as a box
 * to tick rather than a cell. No fill of its own, so it sits on whatever
 * row it is in; the rest edge is a step brighter than a field's and a
 * touch heavier, so a 16px outline holds its own there. Checked is
 * inverted ink, not the accent.
 */
const Checkbox = React.forwardRef<
	React.ElementRef<typeof CheckboxPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
	<CheckboxPrimitive.Root
		ref={ref}
		className={cn(
			"peer grid size-4 shrink-0 cursor-pointer place-content-center rounded-[3px] border-[1.5px] border-input-focus bg-transparent outline-none transition-colors",
			"hover:border-ring focus-visible:border-foreground",
			"disabled:cursor-not-allowed disabled:opacity-50",
			"data-[state=checked]:border-foreground data-[state=checked]:bg-foreground data-[state=checked]:text-background",
			className,
		)}
		{...props}
	>
		<CheckboxPrimitive.Indicator className="grid place-content-center text-current">
			<Check className="size-3" strokeWidth={2.5} />
		</CheckboxPrimitive.Indicator>
	</CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
