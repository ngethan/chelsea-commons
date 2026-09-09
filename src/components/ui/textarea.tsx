import { cn } from "@/lib/utils";
import type * as React from "react";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
	return (
		<textarea
			data-slot="textarea"
			className={cn(
				"w-full min-w-0 rounded-none border border-input bg-card px-3 py-2 text-[14px] text-foreground outline-none transition-colors",
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

export { Textarea };
