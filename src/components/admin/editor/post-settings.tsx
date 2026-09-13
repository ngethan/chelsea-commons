import { H2 } from "@/components/admin/primitives";
import { useUnsavedGuard } from "@/components/admin/unsaved-guard";
import { ConfirmButton } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	FloatingInput,
	FloatingSelect,
	FloatingTextarea,
} from "@/components/ui/floating-field";
import {
	Sheet,
	SheetBody,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	POST_KINDS,
	POST_KIND_LABEL,
	POST_VISIBILITIES,
	slugify,
} from "@/lib/post-state";
import type { PostKind, PostVisibility } from "@/lib/post-state";
import { Trash2 } from "lucide-react";
import { useState } from "react";

export type PostSettingsValues = {
	name: string;
	slug: string;
	description: string;
	subtitle: string;
	dateLabel: string;
	kind: PostKind;
	visibility: PostVisibility;
};

/**
 * Everything about a post that is not the post.
 *
 * A drawer rather than a rail beside the editor: these are read once and set
 * once, and a column of seven fields standing open beside a document is seven
 * things competing with the sentence being written.
 *
 * Two fields carry a rule rather than a value. The slug follows the title
 * while the post is a draft and locks on publish, because the address is in
 * somebody's inbox. Visibility is forced to private for a letter, because a
 * letter listed on the public blog is a mistake and not a choice.
 */
export function PostSettings({
	values,
	published,
	hasLinks,
	onSave,
	onDelete,
	onClose,
}: {
	values: PostSettingsValues;
	published: boolean;
	hasLinks: boolean;
	onSave: (values: PostSettingsValues) => void;
	onDelete: () => void;
	onClose: () => void;
}) {
	const [draft, setDraft] = useState(values);
	const dirty = JSON.stringify(draft) !== JSON.stringify(values);
	const guard = useUnsavedGuard(dirty, onClose);

	function set<K extends keyof PostSettingsValues>(
		key: K,
		value: PostSettingsValues[K],
	) {
		setDraft((prev) => {
			const next = { ...prev, [key]: value };
			// Until it is published the slug is the title, so nobody has to think
			// about it. A hand-typed slug stops following, which is what the
			// override is for.
			if (key === "name" && !published && prev.slug === slugify(prev.name)) {
				next.slug = slugify(String(value));
			}
			if (key === "kind" && value === "letter") next.visibility = "private";
			return next;
		});
	}

	const isLetter = draft.kind === "letter";

	return (
		<Sheet open onOpenChange={(open) => !open && guard.requestClose()}>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>Settings</SheetTitle>
				</SheetHeader>

				<SheetBody>
					<section className="grid grid-cols-2 gap-4">
						<FloatingInput
							label="Title"
							className="col-span-2"
							value={draft.name}
							onChange={(e) => set("name", e.target.value)}
						/>
						<FloatingInput
							label={published ? "Address (locked)" : "Address"}
							className="col-span-2"
							value={draft.slug}
							disabled={published}
							onChange={(e) => set("slug", e.target.value)}
						/>
						<FloatingTextarea
							label="Description"
							className="col-span-2"
							value={draft.description}
							onChange={(e) => set("description", e.target.value)}
						/>
						<FloatingInput
							label="Subtitle"
							value={draft.subtitle}
							onChange={(e) => set("subtitle", e.target.value)}
						/>
						<FloatingInput
							label="Date shown"
							value={draft.dateLabel}
							onChange={(e) => set("dateLabel", e.target.value)}
						/>
					</section>

					<section className="mt-10">
						<H2>Where it goes</H2>
						<div className="grid grid-cols-2 gap-4">
							<FloatingSelect
								label="Kind"
								value={draft.kind}
								disabled={hasLinks}
								onChange={(value) => set("kind", value as PostKind)}
								options={POST_KINDS.map((kind) => ({
									value: kind,
									label: POST_KIND_LABEL[kind],
								}))}
							/>
							<FloatingSelect
								label="Listing"
								value={draft.visibility}
								disabled={isLetter}
								onChange={(value) => set("visibility", value as PostVisibility)}
								options={POST_VISIBILITIES.map((visibility) => ({
									value: visibility,
									label:
										visibility === "public" ? "Listed at /writing" : "Unlisted",
								}))}
							/>
						</div>
					</section>

					<div className="mt-10 flex items-center justify-end gap-2">
						<ConfirmButton
							title="Delete this post?"
							description="Its revisions go with it."
							action="Delete"
							onConfirm={onDelete}
						>
							<Button variant="outline" disabled={hasLinks}>
								<Trash2 />
								Delete
							</Button>
						</ConfirmButton>
						<Button
							disabled={!dirty}
							onClick={() => {
								onSave(draft);
								onClose();
							}}
						>
							Save
						</Button>
					</div>
				</SheetBody>
				{guard.dialog}
			</SheetContent>
		</Sheet>
	);
}
