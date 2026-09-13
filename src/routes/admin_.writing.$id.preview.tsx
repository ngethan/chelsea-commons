import { PostPage } from "@/components/blog/post-page";
import { fetchPostById } from "@/lib/posts-server";
import { buildSeoTags } from "@/site-config";
import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * A draft as its reader will see it.
 *
 * The trailing underscore on `admin_` is what makes this work: it puts the
 * route at `/admin/writing/$id/preview` without nesting it inside the admin
 * layout, so the shell, the rail and the rule that kills the paper grain all
 * stay behind. What renders is `PostPage`, the same component `/writing/$slug`
 * renders, with the same grain and the same type.
 *
 * Escaping the layout also escapes its `beforeLoad`, so the check is repeated
 * here. It is the courtesy redirect either way: the boundary is the server
 * function, which refuses a draft to anybody without a session.
 */
export const Route = createFileRoute("/admin_/writing/$id/preview")({
	loader: async ({ params }) => {
		const { post } = await fetchPostById({ data: { id: params.id } });
		if (!post) throw redirect({ to: "/admin/writing" });
		return { post };
	},
	head: () =>
		buildSeoTags({
			title: "Preview | Chelsea Commons",
			description: "Preview.",
			path: "/admin",
			robots: "noindex, nofollow",
		}),
	component: Preview,
});

function Preview() {
	const { post } = Route.useLoaderData();
	return <PostPage post={post} />;
}
