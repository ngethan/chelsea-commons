import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { Bold, Check, Italic, Link2, Link2Off, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * What you can do to a stretch of text, where the text is.
 *
 * Marks only. Anything that changes what a block *is* belongs to the slash
 * menu, which is reached from an empty line and knows nothing about a
 * selection; this appears only when there is one, and offers the three things
 * that act on it.
 *
 * The link field takes the bar over rather than opening beside it: a popover
 * hanging off a popover, both floating over the sentence being edited, is two
 * layers of chrome on top of the thing they are about.
 */
export function SelectionMenu({ editor }: { editor: Editor }) {
	const [editing, setEditing] = useState(false);
	const [href, setHref] = useState("");
	const input = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (editing) input.current?.focus();
	}, [editing]);

	// A selection that moves is a different link. Closing the field on every
	// change keeps a half-typed URL from landing on whatever got selected next.
	useEffect(() => {
		const close = () => setEditing(false);
		editor.on("selectionUpdate", close);
		return () => {
			editor.off("selectionUpdate", close);
		};
	}, [editor]);

	function openField() {
		setHref(editor.getAttributes("link").href ?? "");
		setEditing(true);
	}

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
			options={{ placement: "top", offset: 8 }}
			className="flex items-center gap-0.5 rounded-md border border-border bg-popover p-1 shadow-md"
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
						label={linked ? "Edit link" : "Link"}
						icon={Link2}
						active={linked}
						onClick={openField}
					/>
					{linked && (
						<Mark
							label="Remove link"
							icon={Link2Off}
							active={false}
							onClick={() => editor.chain().focus().unsetLink().run()}
						/>
					)}
				</>
			)}
		</BubbleMenu>
	);
}

function Mark({
	label,
	icon: Icon,
	active,
	onClick,
}: {
	label: string;
	icon: typeof Bold;
	active: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			title={label}
			// `onMouseDown`, not `onClick`: a click steals focus from the document
			// first, and a collapsed selection is nothing to embolden.
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
			<Icon className="size-3.5" />
			<span className="sr-only">{label}</span>
		</button>
	);
}
