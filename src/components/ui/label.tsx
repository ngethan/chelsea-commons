import { cn } from "@/lib/utils";
import { Label as LabelPrimitive } from "radix-ui";
import type * as React from "react";

function Label({
	className,
	...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
	return (
		<LabelPrimitive.Root
			data-slot="label"
			className={cn(
				"font-medium text-[10px] text-muted-foreground uppercase tracking-[0.08em]",
				"peer-disabled:cursor-not-allowed peer-disabled:opacity-60",
				className,
			)}
			{...props}
		/>
	);
}

export { Label };
