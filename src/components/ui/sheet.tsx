"use client";

import { Dialog as SheetPrimitive } from "radix-ui";
import type * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";

/**
 * The drawer. A Radix Dialog rather than a draggable one: on a desktop screen
 * there is nothing to drag with, and this is the same shape without the
 * pretence.
 *
 * Three deliberate departures from stock shadcn, carried over from berth:
 *
 * 1. `max-w-[720px]`, not `sm:max-w-sm`. 384px on anything wider than a phone
 *    is a strip, and what goes in here is a person's whole record: fields, an
 *    organization, tags, and a timeline.
 * 2. The enter animation starts three quarters of the way in
 *    (`--tw-enter-translate-x: 25%`). Most of a full slide is spent on travel
 *    nobody is waiting to see. The exit still travels the whole way: a panel
 *    that vanishes a quarter of the way out reads as a glitch.
 * 3. Asymmetric durations, 150ms in and 100ms out, for the same reason.
 */
function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
	return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({
	...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
	return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({
	...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
	return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetOverlay({
	className,
	...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
	return (
		<SheetPrimitive.Overlay
			data-slot="sheet-overlay"
			className={cn(
				// The dim alone separates by luminance, and on a cream ground that
				// is a weak signal. The blur separates by focus instead.
				"fixed inset-0 z-[var(--z-modal-backdrop)] bg-foreground/30 backdrop-blur-sm transition-opacity duration-150 dark:bg-black/60",
				"data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
				"data-[state=open]:animate-in data-[state=open]:fade-in-0",
				className,
			)}
			{...props}
		/>
	);
}

function SheetContent({
	className,
	children,
	side = "right",
	...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
	side?: "right" | "left";
}) {
	return (
		<SheetPrimitive.Portal data-slot="sheet-portal">
			<SheetOverlay />
			<SheetPrimitive.Content
				data-slot="sheet-content"
				className={cn(
					"fixed z-[var(--z-modal)] flex flex-col bg-background shadow-lg transition ease-in-out dark:bg-[oklch(0.235_0_0)]",
					"data-[state=open]:animate-in data-[state=open]:duration-150",
					"data-[state=closed]:animate-out data-[state=closed]:duration-100",
					side === "right" &&
						"inset-y-0 right-0 h-full w-full max-w-[720px] border-l border-border data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right data-[state=open]:[--tw-enter-translate-x:25%]",
					side === "left" &&
						"inset-y-0 left-0 h-full w-full max-w-[720px] border-r border-border data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left data-[state=open]:[--tw-enter-translate-x:-25%]",
					className,
				)}
				{...props}
			>
				{children}
				<SheetPrimitive.Close asChild>
					<Button
						variant="icon"
						size="icon-sm"
						className="absolute top-6 right-6"
					>
						<XIcon />
						<span className="sr-only">Close</span>
					</Button>
				</SheetPrimitive.Close>
			</SheetPrimitive.Content>
		</SheetPrimitive.Portal>
	);
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sheet-header"
			className={cn(
				"flex shrink-0 flex-col gap-2 border-b border-border px-8 pt-8 pb-6",
				className,
			)}
			{...props}
		/>
	);
}

function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sheet-body"
			className={cn("min-h-0 flex-1 overflow-auto px-8 py-8", className)}
			{...props}
		/>
	);
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sheet-footer"
			className={cn(
				// Right-aligned: the thing you came to press is on the right, and
				// anything destructive stands to its left where it cannot be hit
				// by reaching for Save.
				"mt-auto flex shrink-0 items-center justify-end gap-2 border-t border-border px-8 py-5",
				className,
			)}
			{...props}
		/>
	);
}

function SheetTitle({
	className,
	...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
	return (
		<SheetPrimitive.Title
			data-slot="sheet-title"
			className={cn(
				"pr-10 font-medium text-[24px] leading-tight text-foreground tracking-[-0.02em]",
				className,
			)}
			{...props}
		/>
	);
}

function SheetDescription({
	className,
	...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
	return (
		<SheetPrimitive.Description
			data-slot="sheet-description"
			className={cn("text-[14px] text-muted-foreground", className)}
			{...props}
		/>
	);
}

export {
	Sheet,
	SheetBody,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetOverlay,
	SheetTitle,
	SheetTrigger,
};
