import { PostEditor } from "@/components/admin/editor/post-editor";
import { PageScroll } from "@/components/admin/primitives";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/toast";
import { trpc } from "@/trpc/client";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/admin/writing/$id/")({
	component: Write,
});

/** Long enough that a sentence is one save, short enough to never lose one. */
const AUTOSAVE_MS = 2000;

function Write() {
	const { id } = Route.useParams();
	const utils = trpc.useUtils();
	const detail = trpc.posts.byId.useQuery({ id });
	const [saved, setSaved] = useState(true);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const save = trpc.posts.update.useMutation({
		onSuccess: () => {
			setSaved(true);
			// The list shows what changed and when; the detail query is not
			// invalidated, because pushing the document back into the editor
			// mid-sentence is how a save eats a keystroke.
			utils.posts.list.invalidate();
		},
		onError: (err) => toast.error(err.message),
	});

	useEffect(() => {
		return () => {
			if (timer.current) clearTimeout(timer.current);
		};
	}, []);

	function onChange(doc: unknown) {
		setSaved(false);
		if (timer.current) clearTimeout(timer.current);
		timer.current = setTimeout(() => {
			save.mutate({ id, doc: doc as { type: "doc" } });
		}, AUTOSAVE_MS);
	}

	/**
	 * The shape of a page of prose, on the editor's own metrics: paragraphs of
	 * lines one line-box apart (1.0625rem of text at 1.75), with the 20px the
	 * prose styles put between paragraphs, under the same padding. The first
	 * line lands where the first line will land, so nothing moves when the
	 * document arrives.
	 */
	if (!detail.data) {
		return (
			<PageScroll>
				<div className="mx-auto w-full max-w-[46rem] px-8 py-10">
					{[
						[96, 100, 88, 62],
						[100, 92, 97, 84, 45],
						[91, 100, 76],
					].map((paragraph, p) => (
						<div
							key={`p-${p}`}
							// `my-5`, the same margin the editor gives a paragraph.
							className="my-5 first:mt-0"
						>
							{paragraph.map((width, line) => (
								<div
									key={`l-${line}`}
									className="flex h-[1.859rem] items-center"
								>
									<Skeleton
										className="h-[0.85rem]"
										style={{ width: `${width}%` }}
									/>
								</div>
							))}
						</div>
					))}
				</div>
			</PageScroll>
		);
	}

	return (
		<PageScroll>
			<div className="mx-auto w-full max-w-[46rem] px-8 py-10">
				<PostEditor doc={detail.data.post.doc} onChange={onChange} />
			</div>

			{/* The only status this page shows, in the one place it cannot be
			    mistaken for part of the document. */}
			<div className="pointer-events-none fixed right-8 bottom-6 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
				{saved ? "Saved" : "Saving"}
			</div>
		</PageScroll>
	);
}
