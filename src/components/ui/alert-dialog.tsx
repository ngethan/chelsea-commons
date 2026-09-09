"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import type * as React from "react";

/**
 * Confirmation for anything that removes something.
 *
 * A real dialog rather than `window.confirm`: the native sheet is the one
 * thing on the page that cannot be made to match the rest of it, and there
 * are enough call sites here (delete a contact, delete an organization,
 * revoke access, revoke a link) that a component earns its place.
 */
function AlertDialog({
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
	return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogTrigger({
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
	return (
		<AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
	);
}

function AlertDialogContent({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
	return (
		<AlertDialogPrimitive.Portal>
			{/* One step above the sheet, not beside it: an alert raised from a
			    drawer has to dim the drawer too, so its scrim sits over the
			    sheet's content and the sheet's own scrim steps aside (see the
			    rule in styles.css). Same darkness as the sheet's, so the page
			    does not get darker when the alert arrives, only wider. */}
			<AlertDialogPrimitive.Overlay
				data-slot="alert-dialog-overlay"
				className={cn(
					"fixed inset-0 z-[var(--z-modal)] bg-foreground/30 backdrop-blur-sm dark:bg-black/60",
					"data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
					"data-[state=open]:animate-in data-[state=open]:fade-in-0",
				)}
			/>
			<AlertDialogPrimitive.Content
				data-slot="alert-dialog-content"
				className={cn(
					"fixed top-1/2 left-1/2 z-[calc(var(--z-modal)+1)] w-full max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-none border border-border bg-popover p-6 shadow-lg",
					"data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
					"data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
					className,
				)}
				{...props}
			/>
		</AlertDialogPrimitive.Portal>
	);
}

function AlertDialogTitle({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
	return (
		<AlertDialogPrimitive.Title
			className={cn("font-medium text-[15px] text-foreground", className)}
			{...props}
		/>
	);
}

function AlertDialogDescription({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
	return (
		<AlertDialogPrimitive.Description
			className={cn(
				"mt-1.5 text-[13px] text-muted-foreground leading-relaxed",
				className,
			)}
			{...props}
		/>
	);
}

function AlertDialogFooter({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("mt-5 flex items-center justify-end gap-2", className)}
			{...props}
		/>
	);
}

function AlertDialogCancel({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
	return (
		<AlertDialogPrimitive.Cancel
			className={cn(
				buttonVariants({ variant: "outline", size: "sm" }),
				className,
			)}
			{...props}
		/>
	);
}

function AlertDialogAction({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action>) {
	return (
		<AlertDialogPrimitive.Action
			className={cn(
				buttonVariants({ variant: "default", size: "sm" }),
				className,
			)}
			{...props}
		/>
	);
}

/** The whole pattern in one component, since every call site is the same shape. */
function ConfirmButton({
	title,
	description,
	action,
	onConfirm,
	children,
	disabled,
}: {
	title: string;
	description: string;
	action: string;
	onConfirm: () => void;
	children: React.ReactNode;
	disabled?: boolean;
}) {
	return (
		<AlertDialog>
			<AlertDialogTrigger asChild disabled={disabled}>
				{children}
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogTitle>{title}</AlertDialogTitle>
				<AlertDialogDescription>{description}</AlertDialogDescription>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction onClick={onConfirm}>{action}</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

/**
 * The same dialog driven by state rather than by a trigger, for the places
 * that have no button to hang it on: a context menu item, a keyboard
 * shortcut. Closing without confirming is the only other way out.
 */
function ConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	action,
	onConfirm,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	action: string;
	onConfirm: () => void;
}) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogTitle>{title}</AlertDialogTitle>
				<AlertDialogDescription>{description}</AlertDialogDescription>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction onClick={onConfirm}>{action}</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogTitle,
	AlertDialogTrigger,
	ConfirmButton,
	ConfirmDialog,
};
