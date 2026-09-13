import { PostPage } from "@/components/blog/post-page";
import { fetchPost } from "@/lib/posts-server";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { buildSeoTags } from "../site-config";

export const Route = createFileRoute("/writing/$slug")({
	loader: async ({ params }) =>
		await fetchPost({ data: { slug: params.slug } }),
	head: ({ loaderData }) => {
		const post = loaderData?.post;
		return buildSeoTags({
			title: `${post?.name || "Post"} | Chelsea Commons`,
			description: post?.description || "Post",
			path: `/writing/${post?.slug || ""}`,
			// An unlisted post is shared by link. Keep it out of search results
			// even though the URL itself is not a secret. A draft is only ever
			// visible to an admin, and has nothing to index either way.
			robots:
				post && (post.visibility === "private" || post.isDraft)
					? "noindex, nofollow"
					: "index, follow",
		});
	},
	component: BlogPost,
});

function BlogPost() {
	const { post } = Route.useLoaderData();

	if (!post) {
		return (
			<div className="relative z-10 min-h-svh text-muted-foreground">
				<div className="mx-auto max-w-2xl px-6 py-12 text-center md:py-24">
					<h1 className="mb-4 text-2xl">Post not found</h1>
					<Link
						to="/writing"
						className="text-muted-foreground hover:text-foreground"
					>
						← Back to writing
					</Link>
				</div>
				<Toaster position="bottom-center" />
			</div>
		);
	}

	return <PostPage post={post} />;
}
