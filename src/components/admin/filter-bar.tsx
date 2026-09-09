import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverAnchor,
	PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ArrowLeft, Check, ChevronRight, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type FilterDef = {
	key: string;
	label: string;
	options: Array<{ value: string; label: string }>;
	value: string | null;
	onChange: (value: string | null) => void;
};

/**
 * "Search or filter", after Ramp: a real text field that narrows the list
 * as you type, and a panel under it, opened by focusing the field, that
 * holds the filters. The panel never takes the keyboard: focus stays in
 * the field, arrow-down steps into the panel, escape closes it.
 *
 * The panel has two pages: the filters, and one filter's options. Applied
 * filters become chips beside the field, and a chip's cross is the only
 * way to clear one, which keeps the panel itself stateless.
 */
export function FilterBar({
	q,
	onQ,
	filters = [],
	placeholder = "Search or filter",
	className,
}: {
	q: string;
	onQ: (q: string) => void;
	filters?: FilterDef[];
	placeholder?: string;
	className?: string;
}) {
	const [open, setOpen] = useState(false);
	const [page, setPage] = useState<FilterDef | null>(null);
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

	const applied = filters.filter((f) => f.value !== null);
	const hasPanel = filters.length > 0;

	function close() {
		setOpen(false);
		setPage(null);
	}

	function focusPanel() {
		panelRef.current?.querySelector<HTMLElement>("[data-row]")?.focus();
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
							value={text}
							placeholder={placeholder}
							onChange={(e) => type(e.target.value)}
							onFocus={() => setOpen(true)}
							onClick={() => setOpen(true)}
							onKeyDown={(e) => {
								if (e.key === "Escape") {
									if (open) close();
									else type("");
								} else if (e.key === "ArrowDown" && hasPanel) {
									e.preventDefault();
									setOpen(true);
									// The panel mounts on the next frame when it was closed.
									requestAnimationFrame(focusPanel);
								}
							}}
							className="h-9 w-full rounded-none border border-input bg-card pr-8 pl-9 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-input-focus"
						/>
						{text && (
							<Button
								variant="icon"
								size="icon-2xs"
								aria-label="Clear search"
								onClick={() => {
									type("");
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
							close();
							inputRef.current?.focus();
						} else if (e.key === "Backspace" && page) {
							e.preventDefault();
							setPage(null);
						}
					}}
				>
					{page ? (
						<>
							<button
								type="button"
								data-row
								onClick={() => setPage(null)}
								className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground"
							>
								<ArrowLeft className="size-3" />
								{page.label}
							</button>
							<Row
								onClick={() => {
									page.onChange(null);
									close();
								}}
								checked={page.value === null}
								muted
							>
								Any
							</Row>
							{page.options.map((option) => (
								<Row
									key={option.value}
									checked={page.value === option.value}
									onClick={() => {
										page.onChange(option.value);
										close();
									}}
								>
									{option.label}
								</Row>
							))}
						</>
					) : (
						<>
							<div className="px-2.5 pt-2 pb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
								Filter by
							</div>
							{filters.map((filter) => (
								<Row key={filter.key} onClick={() => setPage(filter)}>
									<span className="flex-1">{filter.label}</span>
									{filter.value !== null && (
										<span className="text-[12px] text-muted-foreground">
											{filter.options.find((o) => o.value === filter.value)
												?.label ?? filter.value}
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
					label={`${filter.label}: ${
						filter.options.find((o) => o.value === filter.value)?.label ??
						filter.value
					}`}
					onClear={() => filter.onChange(null)}
				/>
			))}
		</div>
	);
}

function Row({
	children,
	onClick,
	checked,
	muted,
}: {
	children: React.ReactNode;
	onClick: () => void;
	/** Shows a check column; `true` fills it. */
	checked?: boolean;
	muted?: boolean;
}) {
	return (
		<button
			type="button"
			data-row
			onClick={onClick}
			className={cn(
				"flex w-full cursor-pointer items-center gap-2.5 rounded-none px-2.5 py-2 text-left text-[13px] outline-none transition-colors hover:bg-hover-accent focus-visible:bg-hover-accent",
				muted ? "text-muted-foreground" : "text-foreground",
			)}
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

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
	return (
		<span className="inline-flex h-7 items-center gap-1 rounded-none bg-secondary pr-1 pl-2.5 text-[12.5px] text-foreground">
			<span className="truncate">{label}</span>
			<Button
				variant="icon"
				size="icon-2xs"
				onClick={onClear}
				aria-label={`Clear ${label}`}
				className="size-5"
			>
				<X className="size-3" />
			</Button>
		</span>
	);
}
