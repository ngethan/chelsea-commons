import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverAnchor,
	PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
	ArrowLeft,
	Building2,
	Check,
	ChevronRight,
	ListFilter,
	type LucideIcon,
	Search,
	X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type FilterDef = {
	key: string;
	label: string;
	/** On the chip, before the label. A generic filter glyph otherwise. */
	icon?: LucideIcon;
	options: Array<{ value: string; label: string }>;
	/** Several at once; empty means the filter is off. */
	value: string[];
	onChange: (values: string[]) => void;
};

/**
 * The organization filter, built the same way wherever a contact list is
 * shown: one option per organization anybody in the list belongs to, by
 * id, sorted by name.
 */
export function organizationFilter(
	rows: Array<{
		organizationId: string | null;
		organizationName: string | null;
	}>,
	value: string[],
	onChange: (values: string[]) => void,
): FilterDef {
	const seen = new Map<string, string>();
	for (const row of rows)
		if (row.organizationId && row.organizationName)
			seen.set(row.organizationId, row.organizationName);
	return {
		key: "org",
		label: "Organization",
		icon: Building2,
		value,
		onChange,
		options: [...seen.entries()]
			.sort((a, b) => a[1].localeCompare(b[1]))
			.map(([id, name]) => ({ value: id, label: name })),
	};
}

/** Comma-joined in the URL, an array in the code. */
export const csv = {
	parse: (raw: string | undefined) =>
		raw ? raw.split(",").filter(Boolean) : [],
	format: (values: string[]) => (values.length ? values.join(",") : undefined),
};

/**
 * "Search or filter", after Ramp: a real text field that narrows the list
 * as you type, and a panel under it, opened by focusing the field, that
 * holds the filters. The panel never takes the keyboard: focus stays in
 * the field, arrow-down steps into the panel, escape closes it.
 *
 * The panel has two pages: the filters, and one filter's options. On the
 * second page the field changes job: what is typed searches that filter's
 * options rather than the list, Enter ticks the first match, and Backspace
 * on an empty field goes back. Options tick on and off without closing, so
 * "Committed and In conversation" is two clicks. A filter with four options
 * and one with a hundred organizations are the same control, and the search
 * never lives inside the panel. Applied filters become chips beside the
 * field, and a chip's cross is the only way to clear one.
 */
export function FilterBar({
	q,
	onQ,
	filters = [],
	placeholder = "Search or filter...",
	className,
}: {
	q: string;
	onQ: (q: string) => void;
	filters?: FilterDef[];
	placeholder?: string;
	className?: string;
}) {
	const [open, setOpen] = useState(false);
	const [pageKey, setPageKey] = useState<string | null>(null);
	/** What is typed while a filter's options are showing. */
	const [optionText, setOptionText] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);

	// The field owns what is typed; `q` (the URL) follows it. Binding the
	// input straight to the URL made every keystroke wait on a navigation
	// before it showed, and fast typing lost letters to the round trip.
	const [text, setText] = useState(q);
	const sent = useRef(q);
	useEffect(() => {
		// Only an outside change (a chip cleared, the back button) resets the
		// field. The URL echoing back what was typed a moment ago must not,
		// or a fast second keystroke is overwritten by the first's echo.
		if (q !== sent.current) {
			sent.current = q;
			setText(q);
		}
	}, [q]);

	function type(next: string) {
		sent.current = next;
		setText(next);
		onQ(next);
	}

	// Looked up by key on every render, so a filter whose options or value
	// changed under us (a tick, a refetch) is the current one, not a copy.
	const page = filters.find((f) => f.key === pageKey) ?? null;
	const applied = filters.filter((f) => f.value.length > 0);
	const hasPanel = filters.length > 0;

	function close() {
		setOpen(false);
		setPageKey(null);
		setOptionText("");
	}

	function enter(filter: FilterDef) {
		setPageKey(filter.key);
		setOptionText("");
		inputRef.current?.focus();
	}

	function leavePage() {
		setPageKey(null);
		setOptionText("");
		inputRef.current?.focus();
	}

	function focusPanel() {
		panelRef.current?.querySelector<HTMLElement>("[data-row]")?.focus();
	}

	const needle = optionText.trim().toLowerCase();
	const options = page
		? page.options.filter(
				(o) => !needle || o.label.toLowerCase().includes(needle),
			)
		: [];

	function toggle(filter: FilterDef, value: string) {
		filter.onChange(
			filter.value.includes(value)
				? filter.value.filter((v) => v !== value)
				: [...filter.value, value],
		);
	}

	return (
		<div className={cn("flex min-w-0 flex-wrap items-center gap-2", className)}>
			<Popover
				open={open && hasPanel}
				onOpenChange={(next) => !next && close()}
			>
				<PopoverAnchor asChild>
					<div className="relative w-[320px]">
						<Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
						<input
							ref={inputRef}
							type="text"
							value={page ? optionText : text}
							placeholder={
								page ? `Search ${page.label.toLowerCase()}` : placeholder
							}
							onChange={(e) =>
								page ? setOptionText(e.target.value) : type(e.target.value)
							}
							onFocus={() => setOpen(true)}
							onClick={() => setOpen(true)}
							onKeyDown={(e) => {
								if (e.key === "Escape") {
									if (page) leavePage();
									else if (open) close();
									else type("");
								} else if (e.key === "Backspace" && page && optionText === "") {
									e.preventDefault();
									leavePage();
								} else if (e.key === "Enter" && page) {
									e.preventDefault();
									const first = options[0];
									if (first) {
										toggle(page, first.value);
										setOptionText("");
									}
								} else if (e.key === "ArrowDown" && hasPanel) {
									e.preventDefault();
									setOpen(true);
									// The panel mounts on the next frame when it was closed.
									requestAnimationFrame(focusPanel);
								}
							}}
							className="h-9 w-full rounded-none border border-input bg-card pr-8 pl-9 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-input-focus"
						/>
						{(page ? optionText : text) && (
							<Button
								variant="icon"
								size="icon-2xs"
								aria-label="Clear"
								onClick={() => {
									if (page) setOptionText("");
									else type("");
									inputRef.current?.focus();
								}}
								className="absolute top-1/2 right-1.5 -translate-y-1/2"
							>
								<X />
							</Button>
						)}
					</div>
				</PopoverAnchor>

				<PopoverContent
					ref={panelRef}
					className="w-[var(--radix-popover-trigger-width)] p-1"
					// Focus stays in the field: the panel is something you glance
					// at while typing, not a place the caret goes.
					onOpenAutoFocus={(e) => e.preventDefault()}
					onCloseAutoFocus={(e) => e.preventDefault()}
					onInteractOutside={(e) => {
						if (inputRef.current?.parentElement?.contains(e.target as Node))
							e.preventDefault();
					}}
					onKeyDown={(e) => {
						const rows = Array.from(
							panelRef.current?.querySelectorAll<HTMLElement>("[data-row]") ??
								[],
						);
						const index = rows.indexOf(document.activeElement as HTMLElement);
						if (e.key === "ArrowDown") {
							e.preventDefault();
							rows[Math.min(index + 1, rows.length - 1)]?.focus();
						} else if (e.key === "ArrowUp") {
							e.preventDefault();
							if (index <= 0) inputRef.current?.focus();
							else rows[index - 1]?.focus();
						} else if (e.key === "Escape") {
							if (page) leavePage();
							else {
								close();
								inputRef.current?.focus();
							}
						} else if (e.key === "Backspace" && page) {
							e.preventDefault();
							leavePage();
						}
					}}
				>
					{page ? (
						<>
							<div className="flex items-center">
								<button
									type="button"
									data-row
									onClick={leavePage}
									className="flex items-center gap-2 px-2.5 py-1.5 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground"
								>
									<ArrowLeft className="size-3" />
									{page.label}
								</button>
								{page.value.length > 0 && (
									<Button
										variant="text"
										size="2xs"
										className="ml-auto mr-1"
										onClick={() => page.onChange([])}
									>
										Clear
									</Button>
								)}
							</div>
							{options.length === 0 && (
								<div className="px-2.5 py-4 text-center text-[13px] text-muted-foreground">
									Nothing matches.
								</div>
							)}
							{/* A long list is scrolled, not truncated, with the match
							    typed in the field above narrowing it. */}
							<div className="max-h-[280px] overflow-y-auto">
								{options.map((option) => (
									<Row
										key={option.value}
										checked={page.value.includes(option.value)}
										onClick={() => toggle(page, option.value)}
									>
										{option.label}
									</Row>
								))}
							</div>
						</>
					) : (
						<>
							<div className="px-2.5 pt-2 pb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
								Filter by
							</div>
							{filters.map((filter) => (
								<Row key={filter.key} onClick={() => enter(filter)}>
									<span className="flex-1">{filter.label}</span>
									{filter.value.length > 0 && (
										<span className="text-[12px] text-muted-foreground tabular-nums">
											{filter.value.length}
										</span>
									)}
									<ChevronRight className="size-3.5 text-muted-foreground" />
								</Row>
							))}
						</>
					)}
				</PopoverContent>
			</Popover>

			{applied.map((filter) => (
				<Chip
					key={filter.key}
					icon={filter.icon}
					label={filter.label}
					value={filter.value
						.map((v) => filter.options.find((o) => o.value === v)?.label ?? v)
						.join(", ")}
					onEdit={() => {
						setPageKey(filter.key);
						setOpen(true);
						inputRef.current?.focus();
					}}
					onClear={() => filter.onChange([])}
				/>
			))}
		</div>
	);
}

function Row({
	children,
	onClick,
	checked,
}: {
	children: React.ReactNode;
	onClick: () => void;
	/** Shows a check column; `true` fills it. */
	checked?: boolean;
}) {
	return (
		<button
			type="button"
			data-row
			onClick={onClick}
			className="flex w-full cursor-pointer items-center gap-2.5 rounded-none px-2.5 py-2 text-left text-[13px] text-foreground outline-none transition-colors hover:bg-hover-accent focus-visible:bg-hover-accent"
		>
			{checked !== undefined && (
				<Check
					className={cn("size-3.5", checked ? "opacity-100" : "opacity-0")}
				/>
			)}
			{children}
		</button>
	);
}

function Chip({
	icon: Icon = ListFilter,
	label,
	value,
	onEdit,
	onClear,
}: {
	icon?: LucideIcon;
	label: string;
	value: string;
	onEdit: () => void;
	onClear: () => void;
}) {
	return (
		<span className="inline-flex h-9 max-w-full items-center gap-1 rounded-full border border-border bg-secondary py-1 pr-1 pl-1 text-[13px]">
			<button
				type="button"
				onClick={onEdit}
				className="flex h-full shrink-0 cursor-pointer items-center gap-2 rounded-full pr-1 pl-2.5 text-foreground outline-none hover:text-foreground focus-visible:text-foreground"
			>
				<Icon className="size-3.5 text-muted-foreground" />
				{label}
			</button>
			<button
				type="button"
				onClick={onEdit}
				className="flex h-full min-w-0 cursor-pointer items-center rounded-full bg-background px-3 text-foreground outline-none transition-colors hover:bg-panel focus-visible:bg-panel"
			>
				<span className="truncate">{value}</span>
			</button>
			<Button
				variant="icon"
				size="icon-2xs"
				onClick={onClear}
				aria-label={`Clear ${label}`}
				className="ml-0.5"
			>
				<X className="size-3" />
			</Button>
		</span>
	);
}
