import { cn } from "@/lib/utils";
import type { Editor } from "@tiptap/react";
import {
	Heading1,
	Heading2,
	Heading3,
	Heading4,
	Images,
	List,
	ListOrdered,
	ListTodo,
	Minus,
	Quote,
	Type,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Type `/` on an empty line and pick a block.
 *
 * This is what the assistant was wanted for: "make this a quote", "put a
 * photo here". Deterministic, instant, and it cannot be wrong about where the
 * cursor is.
 *
 * Every row carries the markdown that does the same thing, because the menu
 * is how you learn there is a faster way. The hints are the editor's real
 * input rules, not a second list that drifts from them.
 */
type Item = {
	label: string;
	icon: typeof Type;
	/** The markdown that does this, shown on the row. */
	hint?: string;
	keywords: string;
	run: (editor: Editor) => void;
};

const ITEMS: Item[] = [
	{
		label: "Text",
		icon: Type,
		keywords: "paragraph body plain",
		run: (e) => e.chain().focus().setParagraph().run(),
	},
	{
		label: "Heading 1",
		icon: Heading1,
		hint: "#",
		keywords: "h1 title",
		run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
	},
	{
		label: "Heading 2",
		icon: Heading2,
		hint: "##",
		keywords: "h2 section",
		run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
	},
	{
		label: "Heading 3",
		icon: Heading3,
		hint: "###",
		keywords: "h3 subheading",
		run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
	},
	{
		label: "Heading 4",
		icon: Heading4,
		hint: "####",
		keywords: "h4 subheading",
		run: (e) => e.chain().focus().toggleHeading({ level: 4 }).run(),
	},
	{
		label: "Bulleted list",
		icon: List,
		hint: "-",
		keywords: "unordered ul bullets",
		run: (e) => e.chain().focus().toggleBulletList().run(),
	},
	{
		label: "Numbered list",
		icon: ListOrdered,
		hint: "1.",
		keywords: "ordered ol numbers",
		run: (e) => e.chain().focus().toggleOrderedList().run(),
	},
	{
		label: "To-do list",
		icon: ListTodo,
		hint: "[]",
		keywords: "task checkbox tick check",
		run: (e) => e.chain().focus().toggleTaskList().run(),
	},
	{
		label: "Quote",
		icon: Quote,
		hint: ">",
		keywords: "blockquote pull",
		run: (e) => e.chain().focus().toggleBlockquote().run(),
	},
	{
		label: "Divider",
		icon: Minus,
		hint: "---",
		keywords: "rule hr line break",
		run: (e) => e.chain().focus().setHorizontalRule().run(),
	},
	{
		label: "Photos",
		icon: Images,
		keywords: "image picture grid",
		run: (e) =>
			e
				.chain()
				.focus()
				.insertContent({ type: "photos", attrs: { photos: [] } })
				.run(),
	},
];

/** `/` at the start of a block, or after a space, and whatever follows it. */
const TRIGGER = /(?:^|\s)\/([\w-]*)$/;

/**
 * The thing that scrolls under the editor. Found by walking up rather than
 * named, so this does not have to know that the page is built out of
 * `PageScroll`, and keeps working if it ever is not.
 */
function scrollParent(node: HTMLElement | null): HTMLElement | null {
	let el = node?.parentElement ?? null;
	while (el) {
		const { overflowY } = getComputedStyle(el);
		if (
			(overflowY === "auto" || overflowY === "scroll") &&
			el.scrollHeight > el.clientHeight
		) {
			return el;
		}
		el = el.parentElement;
	}
	return null;
}

/**
 * The menu's box. Fixed rather than grown to fit, so the list scrolls instead
 * of running off the bottom of a long document, and so its height is known
 * before it is painted: the decision to open upwards has to be made in the
 * same frame, or the menu appears in the wrong place and then jumps.
 */
const MAX_HEIGHT = 288;
const ROW = 30;
const PADDING = 8;
const GAP = 6;
const WIDTH = 280;

export function SlashMenu({ editor }: { editor: Editor }) {
	const [state, setState] = useState<{
		query: string;
		top: number;
		left: number;
		height: number;
		above: boolean;
	} | null>(null);
	const [active, setActive] = useState(0);

	const items = state
		? ITEMS.filter((item) =>
				`${item.label} ${item.keywords}`
					.toLowerCase()
					.includes(state.query.toLowerCase()),
			)
		: [];

	// Where the menu opens is decided from the document, not from a keypress:
	// the caret can also arrive at a slash by clicking, or by undo.
	useEffect(() => {
		const update = () => {
			const { $from, empty } = editor.state.selection;
			if (!empty) return setState(null);

			const before = $from.parent.textBetween(
				0,
				$from.parentOffset,
				"\n",
				"\n",
			);
			const match = before.match(TRIGGER);
			if (!match) return setState(null);

			const query = match[1];
			const showing = ITEMS.filter((item) =>
				`${item.label} ${item.keywords}`
					.toLowerCase()
					.includes(query.toLowerCase()),
			).length;
			if (showing === 0) return setState(null);

			const height = Math.min(showing * ROW + PADDING, MAX_HEIGHT);

			// Viewport coordinates, used as-is: the menu is positioned `fixed`,
			// because the editor sits inside the page's scroll container and
			// anything absolute in there is clipped at its edge. A menu that
			// opens upward has to be able to cross the page head, and no
			// z-index escapes an overflow.
			const coords = editor.view.coordsAtPos($from.pos);

			// Above the caret, bottom edge on the line being typed, so the list
			// grows away from the text instead of burying what comes next. It
			// drops below only when there is no room up there.
			const above = coords.top - height - GAP >= 8;

			setState({
				query,
				above,
				height,
				left: Math.max(
					12,
					Math.min(coords.left, window.innerWidth - WIDTH - 12),
				),
				top: above ? coords.top - height - GAP : coords.bottom + GAP,
			});
			setActive(0);
		};

		editor.on("selectionUpdate", update);
		editor.on("update", update);

		// The page is held still while the menu is open, so scroll should not
		// fire at all. This is the case where nothing scrollable was found to
		// hold, plus a window that resizes under an open menu.
		window.addEventListener("scroll", update, true);
		window.addEventListener("resize", update);

		return () => {
			editor.off("selectionUpdate", update);
			editor.off("update", update);
			window.removeEventListener("scroll", update, true);
			window.removeEventListener("resize", update);
		};
	}, [editor]);

	/**
	 * Keys are taken on the document, in the capture phase, because ProseMirror
	 * listens on the editor's own node: a listener added there runs after its,
	 * and by then Enter has already split the block. Capturing on an ancestor
	 * is the only place that reliably runs first.
	 *
	 * The caret stays in the text throughout, so what is typed keeps filtering.
	 */
	const chosen = useRef<(item: Item) => void>(() => {});
	chosen.current = choose;
	const open = Boolean(state) && items.length > 0;
	const list = useRef(items);
	list.current = items;
	const index = useRef(active);
	index.current = active;

	useEffect(() => {
		if (!open) return;

		const onKey = (event: KeyboardEvent) => {
			const count = list.current.length;
			if (count === 0) return;

			if (event.key === "ArrowDown") {
				event.preventDefault();
				event.stopPropagation();
				setActive((n) => (n + 1) % count);
			} else if (event.key === "ArrowUp") {
				event.preventDefault();
				event.stopPropagation();
				setActive((n) => (n - 1 + count) % count);
			} else if (event.key === "Enter" || event.key === "Tab") {
				event.preventDefault();
				event.stopPropagation();
				chosen.current(list.current[index.current]);
			} else if (event.key === "Escape") {
				event.preventDefault();
				event.stopPropagation();
				setState(null);
			}
		};

		document.addEventListener("keydown", onKey, true);
		return () => document.removeEventListener("keydown", onKey, true);
	}, [open]);

	/**
	 * The page holds still while the menu is open.
	 *
	 * The menu is positioned `fixed` against the caret, so a page that scrolls
	 * underneath it slides the text away from the list that belongs to it. The
	 * list itself still scrolls: it is its own overflow, and `overscroll-contain`
	 * stops that reaching the page when it hits either end.
	 *
	 * The scrollbar's width is handed back as padding, so locking does not
	 * shift the column sideways on a platform that reserves space for one.
	 */
	useEffect(() => {
		if (!open) return;

		const el = scrollParent(editor.view.dom as HTMLElement);
		if (!el) return;

		const gap = el.offsetWidth - el.clientWidth;
		const overflow = el.style.overflow;
		const padding = el.style.paddingRight;

		el.style.overflow = "hidden";
		if (gap > 0) el.style.paddingRight = `${gap}px`;

		return () => {
			el.style.overflow = overflow;
			el.style.paddingRight = padding;
		};
	}, [open, editor]);

	function choose(item: Item) {
		const { $from } = editor.state.selection;
		const before = $from.parent.textBetween(0, $from.parentOffset, "\n", "\n");
		const match = before.match(/(\/[\w-]*)$/);
		if (match) {
			const from = $from.pos - match[1].length;
			editor.chain().focus().deleteRange({ from, to: $from.pos }).run();
		}
		item.run(editor);
		setState(null);
	}

	if (!state || items.length === 0) return null;

	return (
		<div
			className={cn(
				"fixed z-(--z-modal) w-[17.5rem] overflow-y-auto overscroll-contain rounded-lg border border-border bg-popover p-1 shadow-lg",
				"fade-in-0 zoom-in-95 animate-in duration-100",
				state.above ? "slide-in-from-bottom-1" : "slide-in-from-top-1",
			)}
			// The height is set, not left to the content, so that opening above
			// puts the bottom edge exactly on the caret: a box measured one way
			// and positioned another lands wherever the difference falls.
			style={{ top: state.top, left: state.left, height: state.height }}
		>
			{items.map((item, i) => (
				<button
					key={item.label}
					type="button"
					onMouseDown={(event) => {
						event.preventDefault();
						choose(item);
					}}
					onMouseEnter={() => setActive(i)}
					className={cn(
						"flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px]",
						i === active
							? "bg-hover-muted text-foreground"
							: "text-muted-foreground",
					)}
				>
					<item.icon
						className={cn(
							"size-4 shrink-0",
							i === active ? "text-foreground" : "text-muted-foreground/70",
						)}
					/>
					<span className="truncate">{item.label}</span>
					{item.hint && (
						<span className="ml-auto shrink-0 font-mono text-[11.5px] text-muted-foreground/60">
							{item.hint}
						</span>
					)}
				</button>
			))}
		</div>
	);
}
