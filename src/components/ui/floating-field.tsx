"use client";

import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { SelectContent, SelectItem } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, ChevronsUpDown } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import type * as React from "react";
import { useId, useState } from "react";

/**
 * The form field, from berth: the label lives inside the box and rises out
 * of the way once the field is focused or holds something. There is no
 * label stacked above a field anywhere in the admin, and no primitive here
 * to build one with, which is what keeps the convention when a form is
 * added in six months.
 *
 * Still a real `<label for>`, so it reads to assistive tech exactly as a
 * stacked label would. Two things are load-bearing: `placeholder=" "` is set
 * here and omitted from the type, because `:placeholder-shown` is the
 * emptiness test (see `styles.css`); and the label follows the control in
 * the DOM, because the CSS uses a sibling combinator.
 *
 * The select and the combobox have no placeholder to test, so they set
 * `.fl-up` on the label by hand while they hold a value or are open.
 */

/** The box every field shares. Square, one border, brighter edge on focus. */
const box =
	"relative flex w-full min-w-0 items-center rounded-none border border-input bg-card transition-colors has-[:focus-visible]:border-input-focus has-[[aria-invalid=true]]:border-destructive data-[open=true]:border-input-focus";

/** The field's own text area: room at the top for the floated label. */
const control =
	"fl-input peer h-14 w-full bg-transparent px-3.5 pt-5 pb-1.5 text-[14px] text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-60";

type FloatingInputProps = Omit<
	React.ComponentProps<"input">,
	"placeholder" | "className"
> & {
	label: string;
	error?: string | null;
	className?: string;
};

export function FloatingInput({
	label,
	error,
	className,
	id,
	...props
}: FloatingInputProps) {
	const generated = useId();
	const inputId = id ?? generated;
	const errorId = `${inputId}-error`;

	return (
		<div className={cn("flex flex-col gap-1.5", className)}>
			<div className={box}>
				<input
					{...props}
					id={inputId}
					placeholder=" "
					aria-invalid={!!error || undefined}
					aria-describedby={error ? errorId : undefined}
					className={control}
				/>
				<label htmlFor={inputId} className="fl-label">
					{label}
				</label>
			</div>
			{error && (
				<p id={errorId} role="alert" className="text-[12px] text-destructive">
					{error}
				</p>
			)}
		</div>
	);
}

type FloatingTextareaProps = Omit<
	React.ComponentProps<"textarea">,
	"placeholder" | "className"
> & {
	label: string;
	error?: string | null;
	className?: string;
};

export function FloatingTextarea({
	label,
	error,
	className,
	id,
	rows = 3,
	...props
}: FloatingTextareaProps) {
	const generated = useId();
	const areaId = id ?? generated;
	const errorId = `${areaId}-error`;

	return (
		<div className={cn("flex flex-col gap-1.5", className)}>
			<div className={box}>
				<textarea
					{...props}
					id={areaId}
					rows={rows}
					placeholder=" "
					aria-invalid={!!error || undefined}
					aria-describedby={error ? errorId : undefined}
					className="fl-input fl-area peer w-full resize-y bg-transparent px-3.5 pt-6 pb-2 text-[14px] leading-relaxed text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-60"
				/>
				<label htmlFor={areaId} className="fl-label">
					{label}
				</label>
			</div>
			{error && (
				<p id={errorId} role="alert" className="text-[12px] text-destructive">
					{error}
				</p>
			)}
		</div>
	);
}

export type FieldOption = {
	value: string;
	label: string;
	/** Shown after the label in mono, for a domain or an address. */
	hint?: string | null;
};

/**
 * A closed list, for a handful of fixed choices. Anything that grows (an
 * organization, a person) is `FloatingCombobox`, which can be searched.
 */
export function FloatingSelect({
	label,
	value,
	onChange,
	options,
	className,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	options: FieldOption[];
	className?: string;
}) {
	const [open, setOpen] = useState(false);
	const selected = options.find((o) => o.value === value);

	return (
		<SelectPrimitive.Root
			value={value}
			onValueChange={onChange}
			open={open}
			onOpenChange={setOpen}
		>
			<SelectPrimitive.Trigger
				data-open={open}
				className={cn(
					box,
					"h-14 cursor-pointer justify-between px-3.5 pt-5 pb-1.5 text-left text-[14px] text-foreground outline-none",
					"disabled:cursor-not-allowed disabled:opacity-60",
					className,
				)}
			>
				<span className="truncate pr-6">{selected?.label ?? ""}</span>
				<SelectPrimitive.Icon asChild>
					<ChevronDown className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
				</SelectPrimitive.Icon>
				<span className={cn("fl-label", (selected || open) && "fl-up")}>
					{label}
				</span>
			</SelectPrimitive.Trigger>
			<SelectContent>
				{options.map((option) => (
					<SelectItem key={option.value} value={option.value}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</SelectPrimitive.Root>
	);
}

/**
 * A searchable list. Opens a palette-shaped popover the width of the field:
 * type to narrow, enter to pick. `null` is a real choice when `clearLabel`
 * is given, and it is the first row so it is never hidden by a search.
 */
export function FloatingCombobox({
	label,
	value,
	onChange,
	options,
	clearLabel,
	searchPlaceholder = "Search",
	className,
}: {
	label: string;
	value: string | null;
	onChange: (value: string | null) => void;
	options: FieldOption[];
	/** Offer "nothing" as a choice, worded like this. */
	clearLabel?: string;
	searchPlaceholder?: string;
	className?: string;
}) {
	const [open, setOpen] = useState(false);
	const selected = options.find((o) => o.value === value) ?? null;

	function pick(next: string | null) {
		onChange(next);
		setOpen(false);
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					aria-haspopup="listbox"
					aria-expanded={open}
					data-open={open}
					className={cn(
						box,
						"h-14 cursor-pointer justify-between px-3.5 pt-5 pb-1.5 text-left text-[14px] text-foreground outline-none",
						className,
					)}
				>
					<span className="truncate pr-6">{selected?.label ?? ""}</span>
					<ChevronsUpDown className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
					<span className={cn("fl-label", (selected || open) && "fl-up")}>
						{label}
					</span>
				</button>
			</PopoverTrigger>
			<PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
				<Command loop>
					<CommandInput
						placeholder={searchPlaceholder}
						className="text-[13px]"
					/>
					<CommandList className="max-h-[260px]">
						<CommandEmpty>Nothing matches.</CommandEmpty>
						<CommandGroup>
							{clearLabel && (
								<CommandItem
									value="__none__"
									onSelect={() => pick(null)}
									className="text-muted-foreground"
								>
									<Check
										className={cn(
											"size-3.5",
											value === null ? "opacity-100" : "opacity-0",
										)}
									/>
									{clearLabel}
								</CommandItem>
							)}
							{options.map((option) => (
								<CommandItem
									key={option.value}
									value={`${option.label} ${option.hint ?? ""} ${option.value}`}
									onSelect={() => pick(option.value)}
								>
									<Check
										className={cn(
											"size-3.5",
											option.value === value ? "opacity-100" : "opacity-0",
										)}
									/>
									<span className="truncate">{option.label}</span>
									{option.hint && (
										<span className="ml-auto truncate pl-3 font-mono text-[11px] text-muted-foreground">
											{option.hint}
										</span>
									)}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
