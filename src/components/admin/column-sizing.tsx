import type { SortDir } from "@/components/admin/sorting";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp } from "lucide-react";
import type * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Column dividers you can drag.
 *
 * A list table is the page's width, and a grip sits on every rule between
 * two columns. Dragging a grip moves that rule: the column on its left and
 * the column on its right trade width, and nothing else on the page moves.
 * That is what a divider is, and it is the only model that works when the
 * first column takes whatever is left: growing a column by taking from
 * anywhere but its neighbour would move a rule the pointer is not on.
 *
 * The first column (`FillHead`) has no stored width; a fixed-layout table
 * gives it the remainder, so trading with it is just changing its
 * neighbour. Every other column names a starting width, and what has been
 * dragged is kept per table in localStorage: it survives a reload, never
 * crosses a browser, and is read after mount so the server and the first
 * client frame agree. Double-click a grip to put both its columns back.
 */

const MIN = 64;
/** The first column never goes under this. */
const MIN_FILL = 200;
const KEY = (table: string) => `admin.columns.${table}`;

type Widths = Record<string, number>;

function readStored(table: string): Widths {
	try {
		const raw = window.localStorage.getItem(KEY(table));
		if (!raw) return {};
		const parsed: unknown = JSON.parse(raw);
		if (!parsed || typeof parsed !== "object") return {};
		const out: Widths = {};
		for (const [k, v] of Object.entries(parsed)) {
			if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
		}
		return out;
	} catch {
		return {};
	}
}

function writeStored(table: string, widths: Widths) {
	try {
		if (Object.keys(widths).length === 0)
			window.localStorage.removeItem(KEY(table));
		else window.localStorage.setItem(KEY(table), JSON.stringify(widths));
	} catch {
		// A private window, or storage turned off. The widths still work
		// until the page is left.
	}
}

export type ColumnWidths = {
	/** Current width, stored or default. */
	width: (id: string) => number;
	/** Several at once, so a trade is one render. */
	set: (next: Widths) => void;
	reset: (...ids: string[]) => void;
};

export function useColumnWidths(table: string, defaults: Widths): ColumnWidths {
	const [stored, setStored] = useState<Widths>({});

	useEffect(() => {
		setStored(readStored(table));
	}, [table]);

	const width = useCallback(
		(id: string) => stored[id] ?? defaults[id] ?? MIN,
		[stored, defaults],
	);

	const set = useCallback(
		(next: Widths) => {
			setStored((prev) => {
				const out = { ...prev };
				for (const [id, px] of Object.entries(next)) out[id] = Math.round(px);
				writeStored(table, out);
				return out;
			});
		},
		[table],
	);

	const reset = useCallback(
		(...ids: string[]) => {
			setStored((prev) => {
				const out = { ...prev };
				for (const id of ids) delete out[id];
				writeStored(table, out);
				return out;
			});
		},
		[table],
	);

	return { width, set, reset };
}

/** The fill column's marker in `data-col`. */
const FILL = "__fill";

/** The next column to the right that is showing at this width. */
function nextVisible(head: HTMLElement): HTMLElement | null {
	let el = head.nextElementSibling as HTMLElement | null;
	while (el) {
		if (el.offsetWidth > 0 && el.dataset.col) return el;
		el = el.nextElementSibling as HTMLElement | null;
	}
	return null;
}

/**
 * The grip on a head's trailing rule. It trades width between `id` and the
 * next visible column. A button, so a keyboard can reach it: arrows nudge,
 * backspace puts both columns back. No face until hovered or held; the rule
 * it sits on is the affordance.
 */
function Grip({
	cols,
	id,
	headRef,
}: {
	cols: ColumnWidths;
	id: string;
	headRef: React.RefObject<HTMLTableCellElement | null>;
}) {
	const [dragging, setDragging] = useState(false);

	/** Move the rule by `dx`, clamped so neither column goes under its floor. */
	function trade(
		leftStart: number,
		right: HTMLElement,
		rightStart: number,
		dx: number,
	) {
		const rightId = right.dataset.col ?? "";
		const leftMin = id === FILL ? MIN_FILL : MIN;
		const rightMin = rightId === FILL ? MIN_FILL : MIN;
		const moved = Math.max(
			leftMin - leftStart,
			Math.min(rightStart - rightMin, dx),
		);
		const next: Widths = {};
		if (id !== FILL) next[id] = leftStart + moved;
		if (rightId !== FILL) next[rightId] = rightStart - moved;
		cols.set(next);
	}

	function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
		if (e.button !== 0) return;
		const head = headRef.current;
		const right = head && nextVisible(head);
		if (!head || !right) return;
		e.preventDefault();
		const startX = e.clientX;
		const leftStart = head.getBoundingClientRect().width;
		const rightStart = right.getBoundingClientRect().width;
		const grip = e.currentTarget;
		grip.setPointerCapture(e.pointerId);
		setDragging(true);
		// The whole page takes the cursor and gives up selection for the
		// duration, so a fast drag that leaves the grip still reads as one.
		document.documentElement.setAttribute("data-resizing", "");

		const move = (ev: PointerEvent) =>
			trade(leftStart, right, rightStart, ev.clientX - startX);
		const up = () => {
			grip.removeEventListener("pointermove", move);
			grip.removeEventListener("pointerup", up);
			grip.removeEventListener("pointercancel", up);
			document.documentElement.removeAttribute("data-resizing");
			setDragging(false);
		};
		grip.addEventListener("pointermove", move);
		grip.addEventListener("pointerup", up);
		grip.addEventListener("pointercancel", up);
	}

	function nudge(dx: number) {
		const head = headRef.current;
		const right = head && nextVisible(head);
		if (!head || !right) return;
		trade(
			head.getBoundingClientRect().width,
			right,
			right.getBoundingClientRect().width,
			dx,
		);
	}

	function restore() {
		const head = headRef.current;
		const right = head && nextVisible(head);
		const ids = [id, right?.dataset.col ?? ""].filter((c) => c && c !== FILL);
		cols.reset(...ids);
	}

	return (
		<button
			type="button"
			aria-label="Resize column"
			title="Drag to resize. Double-click to reset."
			onPointerDown={onPointerDown}
			onDoubleClick={restore}
			onKeyDown={(e) => {
				const step = e.shiftKey ? 48 : 16;
				if (e.key === "ArrowLeft") nudge(-step);
				else if (e.key === "ArrowRight") nudge(step);
				else if (e.key === "Backspace" || e.key === "Delete") restore();
				else return;
				e.preventDefault();
			}}
			className="group/grip absolute inset-y-0 -right-1 z-10 w-2 cursor-col-resize touch-none select-none border-0 bg-transparent p-0 outline-none"
		>
			<span
				className={cn(
					"absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors",
					dragging
						? "bg-foreground"
						: "bg-transparent group-hover/grip:bg-input-focus group-focus-visible/grip:bg-input-focus",
				)}
			/>
		</button>
	);
}

type HeadProps = React.ThHTMLAttributes<HTMLTableCellElement> & {
	cols: ColumnWidths;
	/** The last column's rule is the page's edge: nothing to trade with. */
	last?: boolean;
};

/** A column the list can be ordered by; see `useSort().on(key)`. */
export type SortControl = { dir: SortDir | null; onToggle: () => void };

/**
 * A sized column's head: `TableHead` at its width, with the grip. The
 * cells under it need nothing; a fixed-layout table takes its widths from
 * the first row. The label truncates rather than the head, because the
 * grip hangs a little outside the head and a clipped head would clip it.
 *
 * With `sort`, the label is a button that cycles the order and carries an
 * arrow while it is in force. The head's own text alignment places it, so
 * a right-aligned column's arrow sits at the trailing edge.
 */
export function ColumnHead({
	cols,
	id,
	last,
	sort,
	className,
	children,
	...props
}: HeadProps & { id: string; sort?: SortControl }) {
	const ref = useRef<HTMLTableCellElement>(null);
	return (
		<TableHead
			ref={ref}
			data-col={id}
			style={{ width: cols.width(id) }}
			className={cn("relative", className)}
			aria-sort={
				sort?.dir === "asc"
					? "ascending"
					: sort?.dir === "desc"
						? "descending"
						: undefined
			}
			{...props}
		>
			{sort ? (
				<button
					type="button"
					onClick={sort.onToggle}
					className={cn(
						"inline-flex max-w-full cursor-pointer items-center gap-1 rounded-none border-0 bg-transparent p-0 text-inherit outline-none transition-colors hover:text-foreground focus-visible:text-foreground",
						sort.dir && "text-foreground",
					)}
				>
					<span className="truncate">{children}</span>
					{sort.dir === "desc" && <ArrowDown className="size-3 shrink-0" />}
					{sort.dir === "asc" && <ArrowUp className="size-3 shrink-0" />}
				</button>
			) : (
				<span className="block truncate">{children}</span>
			)}
			{!last && <Grip cols={cols} id={id} headRef={ref} />}
		</TableHead>
	);
}

/** The first column: no width of its own, it takes what the others leave. */
export function FillHead({
	cols,
	last,
	className,
	children,
	...props
}: HeadProps) {
	const ref = useRef<HTMLTableCellElement>(null);
	return (
		<TableHead
			ref={ref}
			data-col={FILL}
			className={cn("relative", className)}
			{...props}
		>
			<span className="block truncate">{children}</span>
			{!last && <Grip cols={cols} id={FILL} headRef={ref} />}
		</TableHead>
	);
}
