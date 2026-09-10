"use client";

import { Check } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

/** Square, like every other control. Checked is inverted ink, not the accent. */
const Checkbox = React.forwardRef<
	React.ElementRef<typeof CheckboxPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
	<CheckboxPrimitive.Root
		ref={ref}
		className={cn(
			"peer grid size-4 shrink-0 cursor-pointer place-content-center rounded-none border border-input bg-card outline-none transition-colors",
			"hover:border-input-focus focus-visible:border-ring",
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
