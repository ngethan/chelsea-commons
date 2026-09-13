import { Button } from "@/components/ui/button";
import { type Photo, parsePhotos, photoColumns } from "@/lib/photos";
import { toast } from "@/lib/toast";
import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { ImagePlus, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";

async function upload(file: File): Promise<string> {
	const body = new FormData();
	body.append("file", file);
	const response = await fetch("/api/upload", { method: "POST", body });
	const result = await response.json().catch(() => ({}));
	if (!response.ok) throw new Error(result.error ?? "Upload failed.");
	return result.url as string;
}

/**
 * The grid, editable in place.
 *
 * It renders the same columns the reader gets (`photoColumns`), so arranging
 * four photos here is arranging them there. The alt field sits under each one
 * rather than behind a dialog: an alt nobody can see is an alt nobody writes.
 */
export function PhotosView({
	node,
	updateAttributes,
	deleteNode,
}: ReactNodeViewProps) {
	const photos = parsePhotos(node.attrs.photos);
	const input = useRef<HTMLInputElement>(null);
	const [busy, setBusy] = useState(0);

	function set(next: Photo[]) {
		updateAttributes({ photos: next });
	}

	async function add(files: FileList | null) {
		if (!files?.length) return;
		const chosen = [...files];
		setBusy((n) => n + chosen.length);
		for (const file of chosen) {
			try {
				const url = await upload(file);
				set([...parsePhotos(node.attrs.photos), { src: url, alt: "" }]);
			} catch (err) {
				toast.error(err instanceof Error ? err.message : "Upload failed.");
			} finally {
				setBusy((n) => n - 1);
			}
		}
	}

	return (
		<NodeViewWrapper
			className="my-8 border border-border p-3"
			onDrop={(event: React.DragEvent) => {
				event.preventDefault();
				add(event.dataTransfer.files);
			}}
			onDragOver={(event: React.DragEvent) => event.preventDefault()}
		>
			<div className="mb-2 flex items-center justify-between">
				<span className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
					Photos
				</span>
				<div className="flex items-center gap-0.5">
					<Button
						variant="icon"
						size="icon-xs"
						title="Add photos"
						onClick={() => input.current?.click()}
					>
						<ImagePlus />
						<span className="sr-only">Add photos</span>
					</Button>
					<Button
						variant="icon"
						size="icon-xs"
						title="Remove block"
						onClick={deleteNode}
					>
						<Trash2 />
						<span className="sr-only">Remove block</span>
					</Button>
				</div>
			</div>

			<input
				ref={input}
				type="file"
				accept="image/*"
				multiple
				hidden
				onChange={(event) => {
					add(event.target.files);
					event.target.value = "";
				}}
			/>

			{photos.length === 0 && busy === 0 ? (
				<button
					type="button"
					onClick={() => input.current?.click()}
					className="flex h-28 w-full cursor-pointer items-center justify-center border border-ring/60 border-dashed text-[12.5px] text-muted-foreground hover:text-foreground"
				>
					Drop images, or click
				</button>
			) : (
				<div className={`grid gap-3 ${photoColumns(photos.length)}`}>
					{photos.map((photo, index) => (
						<div key={photo.src} className="group relative">
							<img
								src={photo.src}
								alt={photo.alt}
								className="aspect-[3/2] w-full object-cover"
							/>
							<Button
								variant="icon"
								size="icon-xs"
								title="Remove"
								className="absolute top-1 right-1 bg-background/80 opacity-0 group-hover:opacity-100"
								onClick={() => set(photos.filter((_, i) => i !== index))}
							>
								<X />
								<span className="sr-only">Remove</span>
							</Button>
							<input
								value={photo.alt}
								placeholder="Alt text"
								onChange={(event) =>
									set(
										photos.map((entry, i) =>
											i === index
												? { ...entry, alt: event.target.value }
												: entry,
										),
									)
								}
								className="mt-1 w-full bg-transparent text-[12px] text-muted-foreground outline-none placeholder:text-muted-foreground/60 focus:text-foreground"
							/>
						</div>
					))}
					{busy > 0 && (
						<div className="flex aspect-[3/2] w-full items-center justify-center border border-border border-dashed text-[12px] text-muted-foreground">
							Uploading
						</div>
					)}
				</div>
			)}
		</NodeViewWrapper>
	);
}
