import { Badge, type Tone } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";
import { STATUS_LABEL, normalizeStatus } from "@/lib/status";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type * as React from "react";

/**
 * The admin's layout vocabulary.
 *
 * Every screen is one column: the title, a toolbar under it if the page
 * can be searched, the list, and a footer that says how much of it you are
 * looking at. Counts live in that footer and nowhere else: a number in a
 * heading is a claim about the table you are about to read, and a number
 * under it is a fact about the one you just did.
 */

/** The page's root. Fills the inset and hands the scrolling to `PageScroll`. */
export function Page({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div className={cn("flex min-h-0 flex-1 flex-col", className)} {...props} />
	);
}

/** A step in the trail. No `to` is the page being read: text, not a link. */
export type Crumb = { label: string; to?: string };

export function PageHead({
	title,
	crumbs,
	meta,
	toolbar,
	actions,
	loading,
}: {
	title: string;
	/**
	 * The trail above the title, for a page that lives under another: an
	 * update under Updates. Ends with the page being read, as plain text.
	 */
	crumbs?: Crumb[];
	/** Something small and factual under the title: a slug, a path. */
	meta?: React.ReactNode;
	/** The search-or-filter row, under the title on its own rule. */
	toolbar?: React.ReactNode;
	actions?: React.ReactNode;
	/**
	 * A record still loading. The title and the last crumb are the record's
	 * own words, and a page that says "Untitled" for half a second before it
	 * says the real name has told the reader something untrue. This shows
	 * their shape instead, the way a list shows `RowsSkeleton`.
	 */
	loading?: boolean;
}) {
	return (
		<div className="shrink-0 border-b border-border">
			<div className="flex items-end justify-between gap-4 px-4 pt-10 pb-7 md:px-8">
				<div className="flex min-w-0 items-center gap-3">
					<div className="min-w-0">
						{crumbs && crumbs.length > 0 && (
							<nav
								aria-label="Breadcrumb"
								className="mb-3 flex items-center gap-1 text-[13px] text-muted-foreground"
							>
								{crumbs.map((crumb, i) => (
									<span
										key={crumb.to ?? crumb.label}
										className="flex min-w-0 items-center gap-1"
									>
										{i > 0 && (
											<ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" />
										)}
										{crumb.to ? (
											<Link
												to={crumb.to}
												className="rounded-md px-1 py-0.5 -mx-1 no-underline transition-colors hover:bg-hover-muted hover:text-foreground"
											>
												{crumb.label}
											</Link>
										) : loading ? (
											<Skeleton className="h-3.5 w-28" />
										) : (
											<span className="truncate text-foreground">
												{crumb.label}
											</span>
										)}
									</span>
								))}
							</nav>
						)}
						{loading ? (
							<Skeleton className="h-8 w-[22rem] max-w-full" />
						) : (
							<h1 className="truncate text-[32px] font-medium leading-none tracking-[-0.02em]">
								{title}
							</h1>
						)}
						{meta && (
							<div className="mt-2.5 text-[13px] text-muted-foreground">
								{meta}
							</div>
						)}
					</div>
				</div>
				{actions && (
					<div className="flex shrink-0 items-center gap-2">{actions}</div>
				)}
			</div>
			{toolbar && (
				<div className="flex items-center gap-2 border-t border-border px-4 py-2.5 md:px-8">
					{toolbar}
				</div>
			)}
		</div>
	);
}

/** The part of the page that scrolls. The head above it does not. */
export function PageScroll({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div className={cn("min-h-0 flex-1 overflow-auto", className)} {...props} />
	);
}

/** Padded content, for the screens that are prose and cards rather than a list. */
export function PageBody({ className, ...props }: React.ComponentProps<"div">) {
	return <div className={cn("px-4 py-8 md:px-8", className)} {...props} />;
}

/**
 * A full-bleed list. The header sticks to the top of the scroller, columns
 * are ruled, and the outer cells carry the page gutter so the first column
 * lines up with the title above it.
 *
 * `border-separate` because a sticky `<thead>` under `border-collapse` loses
 * its bottom rule the moment it starts to stick, so the lines live on the
 * cells instead. Rendered as a bare `<table>` rather than through `Table`,
 * whose overflow wrapper would become the scroll container and defeat the
 * sticking.
 *
 * `table-fixed` so a column is the width its head says (`ColumnHead`, whose
 * rules can be dragged) and the first column (`FillHead`), which has none,
 * takes the rest. Under auto layout a long cell would push its column
 * wider than the grip had set it. What does not fit a cell is cut with an
 * ellipsis rather than wrapped, so a narrow column costs width, not height.
 */
export function ListTable({
	className,
	...props
}: React.ComponentProps<"table">) {
	return (
		<table
			className={cn(
				"w-full table-fixed border-separate border-spacing-0 text-[13.5px]",
				"[&_td]:overflow-hidden [&_td]:text-ellipsis [&_td]:whitespace-nowrap",
				"[&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-background",
				"[&_th]:border-b [&_th]:border-border [&_td]:border-b [&_td]:border-border",
				"[&_td:not(:last-child)]:border-r [&_th:not(:last-child)]:border-r",
				"[&_td]:py-3.5 [&_th]:h-10",
				"[&_td:first-child:not([data-tick])]:pl-4 [&_th:first-child:not([data-tick])]:pl-4 md:[&_td:first-child:not([data-tick])]:pl-8 md:[&_th:first-child:not([data-tick])]:pl-8",
				"[&_td:last-child]:pr-4 [&_th:last-child]:pr-4 md:[&_td:last-child]:pr-8 md:[&_th:last-child]:pr-8",
				// A selection column: the 16px box centred in a fixed 48px (40 on a
				// phone), the same on every table that has one. Narrower than the
				// gutter would allow, because it is a control and not text: it
				// does not need to start where the title does.
				"[&_[data-tick]]:w-10 [&_[data-tick]]:px-0 md:[&_[data-tick]]:w-12 [&_[data-tick]>*]:mx-auto",
				className,
			)}
			{...props}
		/>
	);
}

/**
 * The line under a list: how many rows you saw, of how many there are, and
 * anything else worth totting up. Mounted outside the scroller so it stays.
 */
export function TableFoot({
	shown,
	total,
	noun,
	children,
}: {
	shown: number;
	total: number;
	/** Plural, lower case: "contacts". */
	noun: string;
	/** Further figures, each its own node; separated by a dot. */
	children?: React.ReactNode;
}) {
	const extras = Array.isArray(children)
		? children.filter(Boolean)
		: children
			? [children]
			: [];
	return (
		<div className="flex h-11 shrink-0 items-center justify-end gap-2.5 border-t border-border px-4 text-[12.5px] text-muted-foreground tabular-nums md:px-8">
			<span>
				{shown === total ? `${total} ${noun}` : `${shown} of ${total} ${noun}`}
			</span>
			{extras.map((extra, index) => (
				<span key={index} className="flex items-center gap-2.5">
					<span className="text-muted-foreground/50">·</span>
					{extra}
				</span>
			))}
		</div>
	);
}

/**
 * A row of square tabs with counts. Used inside the palette to narrow
 * results by kind; not in page heads, where a count is the footer's job.
 */
export function FilterTabs<T extends string>({
	value,
	onChange,
	options,
}: {
	value: T;
	onChange: (value: T) => void;
	options: Array<{ value: T; label: string; count?: number }>;
}) {
	return (
		<div className="flex items-center gap-0.5">
			{options.map((option) => {
				const active = option.value === value;
				return (
					<button
						key={option.value}
						type="button"
						aria-pressed={active}
						onClick={() => onChange(option.value)}
						className={cn(
							"flex h-7 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[12.5px] transition-colors",
							active
								? "bg-secondary text-foreground"
								: "text-muted-foreground hover:bg-hover-muted hover:text-foreground",
						)}
					>
						{option.label}
						{option.count !== undefined && (
							<span
								className={cn(
									"text-[10.5px] tabular-nums",
									active ? "text-muted-foreground" : "text-muted-foreground/70",
								)}
							>
								{option.count}
							</span>
						)}
					</button>
				);
			})}
		</div>
	);
}

/** Where somebody sits in the pipeline, in the tone that stage deserves. */
const STATUS_TONE: Record<ReturnType<typeof normalizeStatus>, Tone> = {
	prospect: "neutral",
	in_conversation: "primary",
	committed: "success",
	passed: "neutral",
};

const TONE_TEXT: Record<Tone, string> = {
	neutral: "text-muted-foreground",
	primary: "text-primary",
	success: "text-success",
	warning: "text-warning",
};

/** A word in its tone. What a table cell shows instead of a chip. */
export function Tinted({
	tone,
	className,
	...props
}: React.ComponentProps<"span"> & { tone: Tone }) {
	return <span className={cn(TONE_TEXT[tone], className)} {...props} />;
}

export function StatusText({
	status,
	className,
}: {
	status: string | null | undefined;
	className?: string;
}) {
	const key = normalizeStatus(status);
	return (
		<Tinted tone={STATUS_TONE[key]} className={className}>
			{STATUS_LABEL[key]}
		</Tinted>
	);
}

/** The chip. For the palette, where a row is dense and needs the shape. */
export function StatusBadge({
	status,
	className,
}: {
	status: string | null | undefined;
	className?: string;
}) {
	const key = normalizeStatus(status);
	return (
		<Badge tone={STATUS_TONE[key]} className={className}>
			{STATUS_LABEL[key]}
		</Badge>
	);
}

/**
 * A square card holding a table: header row, then the table flush to the
 * card's edges. For the settings page, where a list sits inside prose.
 */
export function TableCard({
	title,
	right,
	children,
	className,
}: {
	title: string;
	right?: React.ReactNode;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<Card
			className={cn(
				"overflow-hidden rounded-none border-border bg-transparent p-0 shadow-none",
				className,
			)}
		>
			<CardHeader className="flex-row items-center gap-2 space-y-0 border-b border-border px-4 py-2.5">
				<CardTitle className="font-medium text-[13px]">{title}</CardTitle>
				{right && (
					<div className="ml-auto flex items-center gap-2 text-[12px]">
						{right}
					</div>
				)}
			</CardHeader>
			{children}
		</Card>
	);
}

export function Mono({ className, ...props }: React.ComponentProps<"span">) {
	return (
		<span
			className={cn("font-mono text-[11.5px] text-muted-foreground", className)}
			{...props}
		/>
	);
}

export function H2({
	children,
	right,
	className,
}: {
	children: React.ReactNode;
	/** A control that belongs to the section, at the trailing edge. */
	right?: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("mb-4 flex h-6 items-center gap-2", className)}>
			<h2 className="font-medium text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
				{children}
			</h2>
			{right && <div className="ml-auto flex items-center">{right}</div>}
		</div>
	);
}

/** Zero state, sized to sit inside a table's own width. */
export function Empty({ children }: { children: React.ReactNode }) {
	return (
		<div className="px-4 py-10 text-center text-[13px] text-muted-foreground">
			{children}
		</div>
	);
}

/**
 * What a cell will hold once it loads. The skeleton draws that shape at
 * that height, so the table does not change height or rhythm when the
 * rows arrive: a face is a circle, a checkbox is a square, a name with a
 * line under it is two lines, and every one-line cell is a 20px line box,
 * which is what 13.5px text takes.
 */
export type SkeletonCell =
	| "tick"
	| "person"
	| "lines"
	| "text"
	| "mono"
	| "number"
	| "date"
	| "faces"
	| "pills"
	| "none";

type SkeletonCellSpec =
	| SkeletonCell
	| {
			kind: SkeletonCell;
			/** The real cell's responsive classes, so the columns match at every width. */
			className?: string;
	  };

/** A width that varies row to row without being random, so it does not flicker. */
const vary = (r: number, c: number, from: number, span: number) =>
	`${from + ((r * 7 + c * 13) % span)}%`;

/** Two grey lines: a name, and the smaller line under it. */
function TwoLines({ r, c }: { r: number; c: number }) {
	return (
		<div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
			<Skeleton className="h-3.5" style={{ width: vary(r, c, 35, 30) }} />
			<Skeleton className="h-3" style={{ width: vary(r, c + 1, 25, 30) }} />
		</div>
	);
}

function SkeletonShape({
	kind,
	r,
	c,
}: {
	kind: SkeletonCell;
	r: number;
	c: number;
}) {
	switch (kind) {
		case "tick":
			// The box the checkbox will be: same size, radius and edge, no fill.
			return (
				<div className="size-4 animate-pulse rounded-[3px] border-[1.5px] border-input-focus/60" />
			);
		case "person":
			return (
				<div className="flex h-9 items-center gap-2.5">
					<Skeleton className="size-9 shrink-0 rounded-full" />
					<TwoLines r={r} c={c} />
				</div>
			);
		case "lines":
			return (
				<div className="flex h-9 items-center">
					<TwoLines r={r} c={c} />
				</div>
			);
		case "text":
			return (
				<div className="flex h-5 items-center">
					<Skeleton className="h-3.5" style={{ width: vary(r, c, 30, 45) }} />
				</div>
			);
		case "mono":
			return (
				<div className="flex h-5 items-center">
					<Skeleton className="h-3" style={{ width: vary(r, c, 40, 35) }} />
				</div>
			);
		case "number":
			return (
				<div className="flex h-5 items-center justify-end">
					<Skeleton className="h-3.5 w-6" />
				</div>
			);
		case "date":
			return (
				<div className="flex h-5 items-center justify-end">
					<Skeleton className="h-3.5 w-14" />
				</div>
			);
		case "faces":
			return (
				<div className="flex h-5 items-center">
					{Array.from({ length: 2 + (r % 2) }, (_, i) => (
						<Skeleton
							key={i}
							className="size-5 rounded-full ring-2 ring-background"
							style={{ marginLeft: i ? -6 : 0 }}
						/>
					))}
				</div>
			);
		case "pills":
			return (
				<div className="flex h-5 items-center gap-1">
					<Skeleton className="h-5 w-12 rounded-full" />
					{r % 3 !== 0 && <Skeleton className="h-5 w-16 rounded-full" />}
				</div>
			);
		case "none":
			return <div className="h-5" />;
	}
}

/**
 * Placeholder rows while a list loads. Hand it the row's cells in order,
 * each the kind of thing that will be there, with the real cell's
 * responsive classes where it has them.
 */
export function RowsSkeleton({
	rows = 6,
	cells,
}: {
	rows?: number;
	cells: SkeletonCellSpec[];
}) {
	const specs = cells.map((cell) =>
		typeof cell === "string" ? { kind: cell, className: undefined } : cell,
	);
	return (
		<>
			{Array.from({ length: rows }, (_, r) => (
				<TableRow key={r} className="hover:bg-transparent">
					{specs.map((cell, c) => (
						<TableCell
							key={c}
							data-tick={cell.kind === "tick" ? true : undefined}
							className={cell.className}
						>
							<SkeletonShape kind={cell.kind} r={r} c={c} />
						</TableCell>
					))}
				</TableRow>
			))}
		</>
	);
}
