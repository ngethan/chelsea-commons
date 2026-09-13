import { EMPTY_DOC } from "@/lib/post-doc";
import { cn } from "@/lib/utils";
import DragHandle from "@tiptap/extension-drag-handle-react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { GripVertical } from "lucide-react";
import { useEffect, useRef } from "react";
import { Photos } from "./photos";
import { SelectionMenu } from "./selection-menu";
import { SlashMenu } from "./slash-menu";

/**
 * The document, and only the document.
 *
 * Every other field about a post lives in the settings drawer, so the page
 * under this is one column at the width the published page reads at. The
 * classes here mirror `PostBody`: what a person arranges is what a reader
 * gets, and the two drift the moment they are written twice.
 *
 * Saving is the caller's. This reports a changed document and nothing else,
 * because autosave has to be debounced against the request, not the keystroke.
 */
export function PostEditor({
	doc,
	onChange,
	className,
}: {
	doc: unknown;
	onChange: (doc: unknown) => void;
	className?: string;
}) {
	const latest = useRef(onChange);
	latest.current = onChange;

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				// The document's own title is a field, not the first line of the
				// body, so h1 stays available but nothing depends on it.
				heading: { levels: [1, 2, 3, 4] },
				link: { openOnClick: false, autolink: true },
			}),
			Photos,
		],
		content: (doc as object) ?? EMPTY_DOC,
		editorProps: {
			attributes: {
				class: cn(
					"prose-none max-w-none outline-none",
					"[&_p]:my-5 [&_p]:text-[1.0625rem] [&_p]:leading-[1.75]",
					"[&_h1]:mt-10 [&_h1]:mb-4 [&_h1]:font-serif [&_h1]:text-3xl [&_h1]:text-foreground [&_h1]:leading-snug",
					"[&_h2]:mt-14 [&_h2]:mb-5 [&_h2]:border-border [&_h2]:border-t [&_h2]:pt-8 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-foreground [&_h2]:leading-snug",
					"[&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:text-xl",
					"[&_h4]:mt-6 [&_h4]:mb-2 [&_h4]:font-semibold [&_h4]:text-foreground [&_h4]:text-lg",
					"[&_ul]:my-5 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5",
					"[&_ol]:my-5 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5",
					"[&_blockquote]:my-8 [&_blockquote]:border-border [&_blockquote]:border-l-2 [&_blockquote]:pl-6 [&_blockquote]:font-serif [&_blockquote]:text-2xl [&_blockquote]:text-foreground [&_blockquote]:leading-snug",
					"[&_hr]:my-8 [&_hr]:border-foreground/20",
					"[&_a]:text-foreground [&_a]:underline",
					"[&_strong]:font-semibold",
					"[&_code]:bg-foreground/5 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em]",
					"[&_pre]:my-6 [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-border [&_pre]:bg-card [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-[13px]",
				),
			},
		},
		onUpdate: ({ editor }) => latest.current(editor.getJSON()),
	});

	// A different post in the same component: the editor is reused, so the
	// document has to be pushed into it. `emitUpdate: false` keeps that from
	// arriving back as an edit and marking a freshly opened post dirty.
	const loaded = useRef<unknown>(doc);
	useEffect(() => {
		if (!editor || doc === loaded.current) return;
		loaded.current = doc;
		editor.commands.setContent((doc as object) ?? EMPTY_DOC, {
			emitUpdate: false,
		});
	}, [doc, editor]);

	if (!editor) return null;

	return (
		<div className={cn("relative text-muted-foreground", className)}>
			{/* The grip rides the block under the pointer. Reordering is the
			    thing people reached for the assistant to do, and it is a drag. */}
			{/* The handle's box is one line tall (1.0625rem of text at 1.75
			    line-height), because the handle is anchored to the top of the
			    block: a shorter box centres its icon above the middle of the
			    first line, which reads as the grip floating over the text it
			    belongs to. */}
			<DragHandle editor={editor}>
				<div className="flex h-[1.859rem] w-5 cursor-grab items-center justify-center text-muted-foreground/50 hover:text-foreground active:cursor-grabbing">
					<GripVertical className="h-4 w-4" />
				</div>
			</DragHandle>

			<SelectionMenu editor={editor} />

			<SlashMenu editor={editor} />

			<EditorContent editor={editor} />
		</div>
	);
}
