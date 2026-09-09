"use client";

import { Command as CommandPrimitive } from "cmdk";
import { Loader2, Search } from "lucide-react";
import type { Dialog as DialogPrimitive } from "radix-ui";
import * as React from "react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * The palette. Sized here, on the components, rather than by the block of
 * `[&_[cmdk-*]]` overrides shadcn ships on the dialog: those re-size the
 * palette from the outside at marketing-page proportions, and fought every
 * size set on the pieces themselves.
 */
const Command = React.forwardRef<
	React.ElementRef<typeof CommandPrimitive>,
	React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
	<CommandPrimitive
		ref={ref}
		className={cn(
			"flex h-full w-full flex-col overflow-hidden bg-transparent text-foreground",
			className,
		)}
		{...props}
	/>
));
Command.displayName = CommandPrimitive.displayName;

/**
 * `shouldFilter`, `filter` and `loop` belong to the `Command` inside, not to
 * the `Dialog` the rest of the props go to. Passed at the top level they
 * would be forwarded to Radix and dropped on the floor, which leaves cmdk's
 * fuzzy default running underneath a server search that already did the
 * work, hiding half of its results.
 */
const CommandDialog = ({
	children,
	className,
	shouldFilter,
	filter,
	loop,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Root> & {
	className?: string;
} & Pick<
		React.ComponentProps<typeof CommandPrimitive>,
		"shouldFilter" | "filter" | "loop"
	>) => {
	return (
		<Dialog {...props}>
			<DialogContent
				showCloseButton={false}
				// High on the screen, like a spotlight, and wider than a dialog: a
				// row here carries a name, an address and a status side by side.
				className={cn(
					"top-[14vh] translate-y-0 gap-0 overflow-hidden rounded-lg border-border bg-popover p-0 sm:max-w-[640px]",
					className,
				)}
			>
				<Command
					data-palette=""
					shouldFilter={shouldFilter}
					filter={filter}
					loop={loop}
				>
					{children}
				</Command>
			</DialogContent>
		</Dialog>
	);
};

const CommandInput = React.forwardRef<
	React.ElementRef<typeof CommandPrimitive.Input>,
	React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input> & {
		/** Swaps the glass for a spinner while a request is out. */
		loading?: boolean;
	}
>(({ className, loading, ...props }, ref) => (
	<div
		className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4"
		cmdk-input-wrapper=""
	>
		{loading ? (
			<Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
		) : (
			<Search className="size-4 shrink-0 text-muted-foreground" />
		)}
		<CommandPrimitive.Input
			ref={ref}
			className={cn(
				"h-full w-full bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground/70 disabled:cursor-not-allowed disabled:opacity-50",
				className,
			)}
			{...props}
		/>
	</div>
));
CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = React.forwardRef<
	React.ElementRef<typeof CommandPrimitive.List>,
	React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
	<CommandPrimitive.List
		ref={ref}
		className={cn(
			"max-h-[min(440px,60vh)] scroll-py-2 overflow-y-auto overflow-x-hidden p-1.5",
			className,
		)}
		{...props}
	/>
));
CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = React.forwardRef<
	React.ElementRef<typeof CommandPrimitive.Empty>,
	React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>(({ className, ...props }, ref) => (
	<CommandPrimitive.Empty
		ref={ref}
		className={cn(
			"py-8 text-center text-[13px] text-muted-foreground",
			className,
		)}
		{...props}
	/>
));
CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = React.forwardRef<
	React.ElementRef<typeof CommandPrimitive.Group>,
	React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
	<CommandPrimitive.Group
		ref={ref}
		className={cn(
			"overflow-hidden text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-muted-foreground",
			className,
		)}
		{...props}
	/>
));
CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = React.forwardRef<
	React.ElementRef<typeof CommandPrimitive.Separator>,
	React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
	<CommandPrimitive.Separator
		ref={ref}
		className={cn("-mx-1.5 my-1.5 h-px bg-border", className)}
		{...props}
	/>
));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem = React.forwardRef<
	React.ElementRef<typeof CommandPrimitive.Item>,
	React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
	<CommandPrimitive.Item
		ref={ref}
		className={cn(
			// Square inside a field's popover (a select, a combobox), rounded
			// like a rail row inside the palette, which is a menu, not a field.
			"relative flex cursor-pointer select-none items-center gap-2.5 rounded-none px-2.5 py-2 text-[13px] outline-none [[data-palette]_&]:rounded-md",
			"data-[selected=true]:bg-hover-accent data-[selected=true]:text-foreground",
			"data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
			"[&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0",
			className,
		)}
		{...props}
	/>
));
CommandItem.displayName = CommandPrimitive.Item.displayName;

const CommandShortcut = ({
	className,
	...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
	return (
		<span
			className={cn(
				"ml-auto font-mono text-[11px] text-muted-foreground",
				className,
			)}
			{...props}
		/>
	);
};
CommandShortcut.displayName = "CommandShortcut";

/** The strip under the list: key hints on the left, whatever else on the right. */
function CommandFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"flex h-9 shrink-0 items-center gap-4 border-t border-border px-3 text-[11px] text-muted-foreground",
				className,
			)}
			{...props}
		/>
	);
}

export {
	Command,
	CommandDialog,
	CommandInput,
	CommandList,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandShortcut,
	CommandSeparator,
	CommandFooter,
};
