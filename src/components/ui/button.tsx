import { type VariantProps, cva } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Square. A button is a control that sits in the page, and controls here
 * have edges, not corners. The only round button is the icon-only one,
 * for the reason given on the `icon` variant.
 *
 * There is no destructive variant. Delete is an outline button with a
 * trash icon and a confirm behind it; the confirm is where the weight
 * lives, not in a red fill. See DESIGN-ADMIN.md.
 */
const buttonVariants = cva(
	"group/button inline-flex shrink-0 cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-none border border-transparent bg-clip-padding text-sm font-medium outline-none transition-colors focus-visible:border-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground hover:bg-primary/90",
				/** Louder than `default` without spending the accent. */
				foreground:
					"bg-foreground text-background hover:bg-foreground/90 focus-visible:border-primary",
				outline:
					"border-border bg-transparent hover:bg-hover-muted hover:text-foreground aria-expanded:bg-hover-muted aria-expanded:text-foreground",
				secondary:
					"bg-secondary text-secondary-foreground hover:bg-hover-accent aria-expanded:bg-hover-accent",
				ghost:
					"hover:bg-hover-muted hover:text-foreground aria-expanded:bg-hover-muted aria-expanded:text-foreground",
				/** Reads as a label until you hover it. */
				text: "text-muted-foreground hover:text-foreground",
				/**
				 * Icon-only, no chrome until you reach for it. Pair with an
				 * `icon*` size, which is what supplies the circular hover target.
				 *
				 * A circle rather than a square in a UI where everything else is
				 * square: at 24 to 40px a rounded rectangle just reads as a corner
				 * radius that disagrees with the rest of the page, whereas a circle
				 * reads as a hit area. It is the same exception the avatars make.
				 */
				icon: "bg-transparent text-muted-foreground hover:bg-hover-muted hover:text-foreground aria-expanded:bg-hover-muted aria-expanded:text-foreground",
				link: "text-primary underline-offset-4 hover:underline",
			},
			// 40px is the button. The sizes under it are for rows and toolbars,
			// where a full-height control would be the tallest thing in sight.
			size: {
				default: "h-10 gap-2 px-4 text-[14px]",
				sm: "h-8 gap-1.5 px-3 text-[13px] [&_svg:not([class*='size-'])]:size-3.5",
				xs: "h-7 gap-1 px-2.5 text-[12.5px] [&_svg:not([class*='size-'])]:size-3.5",
				"2xs":
					"h-6 gap-1 px-2 text-[12px] [&_svg:not([class*='size-'])]:size-3",
				lg: "h-11 gap-2 px-5 text-[14px]",
				xl: "h-12 gap-2 px-6 text-[15px]",
				icon: "size-10 rounded-full",
				"icon-sm": "size-8 rounded-full",
				"icon-xs": "size-7 rounded-full [&_svg:not([class*='size-'])]:size-3.5",
				"icon-2xs": "size-6 rounded-full [&_svg:not([class*='size-'])]:size-3",
				"icon-lg": "size-11 rounded-full",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

function Button({
	className,
	variant = "default",
	size = "default",
	asChild = false,
	...props
}: React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
	}) {
	const Comp = asChild ? Slot.Root : "button";

	return (
		<Comp
			data-slot="button"
			data-variant={variant}
			data-size={size}
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

export { Button, buttonVariants };
