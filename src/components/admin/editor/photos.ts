import { parsePhotos } from "@/lib/photos";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { PhotosView } from "./photos-view";

/**
 * `photos` as ProseMirror sees it: one atom holding the whole grid, not a
 * container of image nodes.
 *
 * An atom because the grid is the unit a writer moves, deletes and drags. A
 * container would let the cursor walk into it and leave half a row behind on
 * a backspace, and there is nothing to type between two images anyway.
 */
export const Photos = Node.create({
	name: "photos",
	group: "block",
	atom: true,
	draggable: true,

	addAttributes() {
		return {
			photos: {
				default: [] as unknown,
				parseHTML: (element) => {
					try {
						return parsePhotos(
							JSON.parse(element.getAttribute("data-photos") ?? "[]"),
						);
					} catch {
						return [];
					}
				},
				renderHTML: (attributes) => ({
					"data-photos": JSON.stringify(parsePhotos(attributes.photos)),
				}),
			},
		};
	},

	parseHTML() {
		return [{ tag: "div[data-photos]" }];
	},

	renderHTML({ HTMLAttributes }) {
		return ["div", mergeAttributes(HTMLAttributes)];
	},

	addNodeView() {
		return ReactNodeViewRenderer(PhotosView);
	},
});
