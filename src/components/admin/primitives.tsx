import { Badge, type Tone } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";
import { STATUS_LABEL, normalizeStatus } from "@/lib/status";
import { cn } from "@/lib/utils";
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

export function PageHead({
	title,
	meta,
	toolbar,
	actions,
}: {
	title: string;
	/** Something small and factual under the title: a slug, a path. */
	meta?: React.ReactNode;
	/** The search-or-filter row, under the title on its own rule. */
	toolbar?: React.ReactNode;
	actions?: React.ReactNode;
}) {
	return (
		<div className="shrink-0 border-b border-border">
			<div className="flex items-end justify-between gap-4 px-4 pt-10 pb-7 md:px-8">
				<div className="flex min-w-0 items-center gap-3">
					<div className="min-w-0">
						<h1 className="truncate text-[32px] font-medium leading-none tracking-[-0.02em]">
							{title}
						</h1>
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
 */
export function ListTable({
	className,
	...props
}: React.ComponentProps<"table">) {
	return (
		<table
			className={cn(
				"w-full border-separate border-spacing-0 text-[13.5px]",
				"[&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-background",
				"[&_th]:border-b [&_th]:border-border [&_td]:border-b [&_td]:border-border",
				"[&_td:not(:last-child)]:border-r [&_th:not(:last-child)]:border-r",
				"[&_td]:py-3.5 [&_th]:h-10",
				"[&_td:first-child]:pl-4 [&_th:first-child]:pl-4 md:[&_td:first-child]:pl-8 md:[&_th:first-child]:pl-8",
				"[&_td:last-child]:pr-4 [&_th:last-child]:pr-4 md:[&_td:last-child]:pr-8 md:[&_th:last-child]:pr-8",
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

/** Placeholder rows while a list loads, so the table does not jump in. */
export function RowsSkeleton({
	rows = 6,
	cols = 3,
}: {
	rows?: number;
	cols?: number;
}) {
	return (
		<>
			{Array.from({ length: rows }, (_, r) => (
				<TableRow key={r} className="hover:bg-transparent">
					{Array.from({ length: cols }, (_, c) => (
						<TableCell key={c}>
							<Skeleton
								className="h-3.5"
								style={{
									width: `${c === 0 ? 55 : 30 + ((r * 7 + c * 13) % 40)}%`,
								}}
							/>
						</TableCell>
					))}
				</TableRow>
			))}
		</>
	);
}
