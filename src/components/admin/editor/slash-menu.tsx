import { cn } from "@/lib/utils";
import type { Editor } from "@tiptap/react";
import {
	Heading2,
	Heading3,
	Images,
	List,
	ListOrdered,
	Minus,
	Quote,
	Type,
} from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Type `/` at the start of an empty block and pick a block.
 *
 * This is what the assistant was wanted for: "put a photo here", "make this a
 * quote". Deterministic, instant, and it cannot be wrong about where the
 * cursor is. Filtering is by what is typed after the slash, so the keyboard
 * never has to leave the document.
 */
type Item = {
	label: string;
	icon: typeof Type;
	keywords: string;
	run: (editor: Editor) => void;
};

const ITEMS: Item[] = [
	{
		label: "Text",
		icon: Type,
		keywords: "paragraph body",
		run: (e) => e.chain().focus().setParagraph().run(),
	},
	{
		label: "Heading",
		icon: Heading2,
		keywords: "h2 title section",
		run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
	},
	{
		label: "Subheading",
		icon: Heading3,
		keywords: "h3 small",
		run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
	},
	{
		label: "Bullets",
		icon: List,
		keywords: "list unordered ul",
		run: (e) => e.chain().focus().toggleBulletList().run(),
	},
	{
		label: "Numbers",
		icon: ListOrdered,
		keywords: "list ordered ol",
		run: (e) => e.chain().focus().toggleOrderedList().run(),
	},
	{
		label: "Quote",
		icon: Quote,
		keywords: "blockquote pull",
		run: (e) => e.chain().focus().toggleBlockquote().run(),
	},
	{
		label: "Divider",
		icon: Minus,
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

export function SlashMenu({ editor }: { editor: Editor }) {
	const [state, setState] = useState<{
		query: string;
		top: number;
		left: number;
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
	// the caret can also arrive at a slash by clicking or by undo.
	useEffect(() => {
		const update = () => {
			const { state: pmState } = editor;
			const { $from, empty } = pmState.selection;
			if (!empty) return setState(null);

			const before = $from.parent.textBetween(
				0,
				$from.parentOffset,
				"\n",
				"\n",
			);
			const match = before.match(/(?:^|\s)\/([\w]*)$/);
			if (!match) return setState(null);

			const coords = editor.view.coordsAtPos($from.pos);
			const box = editor.view.dom.getBoundingClientRect();
			setState({
				query: match[1],
				top: coords.bottom - box.top + 6,
				left: coords.left - box.left,
			});
			setActive(0);
		};

		editor.on("selectionUpdate", update);
		editor.on("update", update);
		return () => {
			editor.off("selectionUpdate", update);
			editor.off("update", update);
		};
	}, [editor]);

	// Keys are taken on the document, because the menu never holds focus: the
	// caret stays in the text so what is typed keeps filtering.
	useEffect(() => {
		if (!state || items.length === 0) return;

		const onKey = (event: KeyboardEvent) => {
			if (event.key === "ArrowDown") {
				event.preventDefault();
				setActive((n) => (n + 1) % items.length);
			} else if (event.key === "ArrowUp") {
				event.preventDefault();
				setActive((n) => (n - 1 + items.length) % items.length);
			} else if (event.key === "Enter" || event.key === "Tab") {
				event.preventDefault();
				choose(items[active]);
			} else if (event.key === "Escape") {
				setState(null);
			}
		};

		const dom = editor.view.dom;
		dom.addEventListener("keydown", onKey);
		return () => dom.removeEventListener("keydown", onKey);
	});

	function choose(item: Item) {
		const { $from } = editor.state.selection;
		const before = $from.parent.textBetween(0, $from.parentOffset, "\n", "\n");
		const match = before.match(/(?:^|\s)(\/[\w]*)$/);
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
			className="absolute z-40 w-[220px] overflow-hidden rounded-md border border-border bg-popover py-1 shadow-md"
			style={{ top: state.top, left: state.left }}
		>
			{items.map((item, index) => (
				<button
					key={item.label}
					type="button"
					onMouseDown={(event) => {
						event.preventDefault();
						choose(item);
					}}
					onMouseEnter={() => setActive(index)}
					className={cn(
						"flex w-full cursor-pointer items-center gap-2.5 px-3 py-1.5 text-left text-[13px]",
						index === active
							? "bg-hover-muted text-foreground"
							: "text-muted-foreground",
					)}
				>
					<item.icon className="h-3.5 w-3.5" />
					{item.label}
				</button>
			))}
		</div>
	);
}
