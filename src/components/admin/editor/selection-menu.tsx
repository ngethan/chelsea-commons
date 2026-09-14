import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import {
	Baseline,
	Bold,
	Check,
	Code,
	Eraser,
	Italic,
	Link2,
	Link2Off,
	Pipette,
	Strikethrough,
	Underline,
	X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * What you can do to a stretch of text, where the text is.
 *
 * Marks only. Anything that changes what a block *is* belongs to the slash
 * menu, which is reached from an empty line and knows nothing about a
 * selection; this appears only when there is one.
 *
 * The link field and the colour row take the bar over rather than opening
 * beside it: a popover hanging off a popover, both floating over the sentence
 * being edited, is two layers of chrome on top of the thing they are about.
 */

/**
 * The colours prose can be, named rather than mixed. A custom hex sits behind
 * the pipette at the end for the once-in-a-while it is wanted; the named ones
 * are first because they are what a letter should mostly be made of.
 *
 * `--prose-*`, not the UI palette. The editor is dark and the page is cream,
 * and the same UI token means different things on each: `--primary` is the
 * orange accent here and the near-black ink there, so a word coloured while
 * writing published as ordinary body text. These four are defined once per
 * ground in `styles.css`, so a name means the same thing in both.
 */
const COLORS = [
	{ label: "Default", value: null },
	{ label: "Muted", value: "var(--prose-muted)" },
	{ label: "Accent", value: "var(--prose-accent)" },
	{ label: "Success", value: "var(--prose-success)" },
	{ label: "Warning", value: "var(--prose-warning)" },
] as const;

export function SelectionMenu({ editor }: { editor: Editor }) {
	const [editing, setEditing] = useState(false);
	const [picking, setPicking] = useState(false);
	/** What the native picker opens on. Seeded from the current colour if it is
	 *  already a hex; the tokens are not, so those fall back to the ink. */
	const [custom, setCustom] = useState("#2b2b2b");
	const [href, setHref] = useState("");
	const input = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (editing) input.current?.focus();
	}, [editing]);

	// A selection that moves is a different link. Closing the field on every
	// change keeps a half-typed URL from landing on whatever got selected next.
	useEffect(() => {
		const close = () => {
			setEditing(false);
			setPicking(false);
		};
		editor.on("selectionUpdate", close);
		return () => {
			editor.off("selectionUpdate", close);
		};
	}, [editor]);

	function openPicker() {
		const current = editor.getAttributes("textStyle").color;
		if (typeof current === "string" && current.startsWith("#")) {
			setCustom(current);
		}
		setPicking(true);
	}

	function openField() {
		setHref(editor.getAttributes("link").href ?? "");
		setEditing(true);
	}

	/**
	 * cmd-K over a selection opens the link field, the way it does in every
	 * other editor. Captured on the document so it lands before the command
	 * palette's own binding, which also stands down while prose has focus (see
	 * `isEditingProse`); capturing means the order of the two no longer
	 * decides which one wins.
	 */
	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "k" || !(event.metaKey || event.ctrlKey)) return;
			if (!editor.isFocused || editor.state.selection.empty) return;
			event.preventDefault();
			event.stopPropagation();
			openField();
		};

		document.addEventListener("keydown", onKey, true);
		return () => document.removeEventListener("keydown", onKey, true);
	});

	function apply() {
		const value = href.trim();
		if (!value) {
			editor.chain().focus().unsetLink().run();
		} else {
			// A bare domain is a link to that domain, not to a path on this site.
			// Typing "example.com" and landing on /example.com is never what was
			// meant, and it fails in a way that looks like the editor's fault.
			const url = /^[a-z][\w+.-]*:|^\/|^#/i.test(value)
				? value
				: `https://${value}`;
			editor
				.chain()
				.focus()
				.extendMarkRange("link")
				.setLink({ href: url })
				.run();
		}
		setEditing(false);
	}

	const linked = editor.isActive("link");

	return (
		<BubbleMenu
			editor={editor}
			// `fixed`, for the same reason the slash menu is: the editor sits in
			// the page's scroll container, and an absolutely positioned bar is
			// clipped at its edge rather than floating over the page head.
			options={{ placement: "top", offset: 8, strategy: "fixed" }}
			className="z-(--z-modal) flex items-center gap-0.5 rounded-md border border-border bg-popover p-1 shadow-md"
		>
			{editing ? (
				<div className="flex items-center gap-1 px-1">
					<input
						ref={input}
						value={href}
						placeholder="Paste or type a link"
						onChange={(e) => setHref(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								apply();
							}
							if (e.key === "Escape") {
								e.preventDefault();
								setEditing(false);
							}
						}}
						className="h-7 w-[15rem] bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/60"
					/>
					<Button variant="icon" size="icon-xs" title="Apply" onClick={apply}>
						<Check />
						<span className="sr-only">Apply</span>
					</Button>
					<Button
						variant="icon"
						size="icon-xs"
						title="Cancel"
						onClick={() => setEditing(false)}
					>
						<X />
						<span className="sr-only">Cancel</span>
					</Button>
				</div>
			) : picking ? (
				<div className="flex items-center gap-0.5">
					{COLORS.map((colour) => (
						<Mark
							key={colour.label}
							label={colour.label}
							active={
								colour.value === null
									? !editor.getAttributes("textStyle").color
									: editor.isActive("textStyle", { color: colour.value })
							}
							onClick={() => {
								const chain = editor.chain().focus();
								if (colour.value === null) chain.unsetColor().run();
								else chain.setColor(colour.value).run();
								setPicking(false);
							}}
						>
							<span
								aria-hidden="true"
								className="size-3.5 rounded-full border border-border"
								style={{
									background:
										colour.value === null ? "var(--foreground)" : colour.value,
								}}
							/>
						</Mark>
					))}
					<Divider />

					{/* A hex is a fixed colour, unlike the four above: it is
					    picked against this dark page and published onto a cream
					    one, so it looks the same in both rather than right in
					    both. That is the trade for being able to pick anything. */}
					<Tooltip>
						<TooltipTrigger asChild>
							<label className="flex size-7 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:bg-hover-muted hover:text-foreground">
								<Pipette className="size-3.5" />
								<span className="sr-only">Custom colour</span>
								<input
									type="color"
									value={custom}
									className="sr-only"
									onChange={(event) => {
										setCustom(event.target.value);
										editor.chain().focus().setColor(event.target.value).run();
									}}
								/>
							</label>
						</TooltipTrigger>
						<TooltipContent sideOffset={6}>Custom colour</TooltipContent>
					</Tooltip>

					<Mark label="Back" icon={X} onClick={() => setPicking(false)} />
				</div>
			) : (
				<>
					<Mark
						label="Bold"
						icon={Bold}
						active={editor.isActive("bold")}
						onClick={() => editor.chain().focus().toggleBold().run()}
					/>
					<Mark
						label="Italic"
						icon={Italic}
						active={editor.isActive("italic")}
						onClick={() => editor.chain().focus().toggleItalic().run()}
					/>
					<Mark
						label="Underline"
						icon={Underline}
						active={editor.isActive("underline")}
						onClick={() => editor.chain().focus().toggleUnderline().run()}
					/>
					<Mark
						label="Strikethrough"
						icon={Strikethrough}
						active={editor.isActive("strike")}
						onClick={() => editor.chain().focus().toggleStrike().run()}
					/>
					<Mark
						label="Code"
						icon={Code}
						active={editor.isActive("code")}
						onClick={() => editor.chain().focus().toggleCode().run()}
					/>

					<Divider />

					<Mark
						label="Colour"
						icon={Baseline}
						active={Boolean(editor.getAttributes("textStyle").color)}
						onClick={openPicker}
					/>
					<Mark
						label={linked ? "Edit link" : "Link"}
						icon={Link2}
						active={linked}
						onClick={openField}
					/>
					{linked && (
						<Mark
							label="Remove link"
							icon={Link2Off}
							onClick={() => editor.chain().focus().unsetLink().run()}
						/>
					)}

					<Divider />

					{/* Marks only, and not the block: somebody reaching for this
					    wants the bold and the colour gone, not their heading
					    turned back into a paragraph underneath them. */}
					<Mark
						label="Clear formatting"
						icon={Eraser}
						onClick={() =>
							editor.chain().focus().unsetAllMarks().unsetColor().run()
						}
					/>
				</>
			)}
		</BubbleMenu>
	);
}

function Divider() {
	return <span aria-hidden="true" className="mx-1 h-4 w-px bg-border" />;
}

/**
 * One button. The label is the tooltip and the screen-reader name both, so an
 * icon nobody recognises still says what it does and there is one string to
 * get right rather than two.
 */
function Mark({
	label,
	icon: Icon,
	active = false,
	onClick,
	children,
}: {
	label: string;
	icon?: typeof Bold;
	active?: boolean;
	onClick: () => void;
	children?: React.ReactNode;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					// `onMouseDown`, not `onClick`: a click steals focus from the
					// document first, and a collapsed selection is nothing to
					// embolden.
					onMouseDown={(event) => {
						event.preventDefault();
						onClick();
					}}
					className={cn(
						"flex size-7 cursor-pointer items-center justify-center rounded-sm",
						active
							? "bg-secondary text-foreground"
							: "text-muted-foreground hover:bg-hover-muted hover:text-foreground",
					)}
				>
					{children ?? (Icon ? <Icon className="size-3.5" /> : null)}
					<span className="sr-only">{label}</span>
				</button>
			</TooltipTrigger>
			<TooltipContent sideOffset={6}>{label}</TooltipContent>
		</Tooltip>
	);
}
