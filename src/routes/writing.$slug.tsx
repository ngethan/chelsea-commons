import { fetchPost } from "@/lib/posts-server";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Link2, Undo2 } from "lucide-react";
import { useMemo } from "react";
import { Toaster, toast } from "sonner";
import { MarkdownContent } from "../components/blog/markdown-content";
import { TableOfContents } from "../components/blog/table-of-contents";
import { CustomToast } from "../components/custom-toast";
import { buildSeoTags, siteConfig } from "../site-config";
import { extractHeadings } from "../utils/markdown";

export const Route = createFileRoute("/writing/$slug")({
	loader: async ({ params }) =>
		await fetchPost({ data: { slug: params.slug } }),
	head: ({ loaderData }) => {
		const post = loaderData?.post;
		return buildSeoTags({
			title: `${post?.name || "Post"} | Chelsea Commons`,
			description: post?.description || "Post",
			path: `/writing/${post?.slug || ""}`,
			// A private post is unlisted and shared by link. Keep it out of
			// search results even though the URL itself is not a secret.
			robots:
				post && post.visibility === "private"
					? "noindex, nofollow"
					: "index, follow",
		});
	},
	component: BlogPost,
});

function BlogPost() {
	const { post } = Route.useLoaderData();

	const headings = useMemo(
		() => (post ? extractHeadings(post.content) : []),
		[post],
	);

	const handleCopyLink = () => {
		navigator.clipboard.writeText(`${siteConfig.url}/writing/${post?.slug}`);
		toast.custom(() => <CustomToast message="Link copied to clipboard!" />);
	};

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

	// A private post is a letter sent to named people. The blog chrome, a back
	// link into an index it isn't in and buttons to share it publicly, is
	// exactly wrong there, so it gets a quieter frame around the same body.
	const isPrivate = post.visibility === "private";

	if (isPrivate) {
		return (
			<main className="relative z-10 min-h-svh bg-background">
				<div className="mx-auto max-w-[46rem] px-6 py-16 md:px-8 md:py-24">
					<header className="mb-12">
						<h1 className="font-serif text-4xl text-foreground leading-[1.1] md:text-5xl">
							{post.name}
						</h1>
						<p className="mt-4 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
							{post.subtitle ? `${post.subtitle} · ${post.date}` : post.date}
						</p>
					</header>

					<MarkdownContent markdown={post.content} />
				</div>
			</main>
		);
	}

	return (
		<div className="relative z-10 min-h-svh text-muted-foreground">
			<TableOfContents headings={headings} />

			<Link
				to="/writing"
				className="fixed top-6 left-6 z-20 inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground md:top-36 md:left-24"
			>
				<Undo2 className="h-4 w-4" />
				Writing
			</Link>

			<div className="mx-auto max-w-2xl px-6 py-12 md:py-24">
				<article className="space-y-8">
					<header className="space-y-4 border-foreground/20 border-b pb-6">
						<h1 className="font-medium text-3xl text-foreground leading-tight md:text-4xl">
							{post.name}
						</h1>
						<div className="flex items-center justify-between gap-4">
							<time className="text-muted-foreground text-sm">{post.date}</time>
							<div className="flex items-center gap-1">
								<a
									href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.name)}&url=${encodeURIComponent(`${siteConfig.url}/writing/${post.slug}`)}`}
									target="_blank"
									rel="noopener noreferrer"
									className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
								>
									<span className="sr-only">Share on Twitter</span>
									<svg
										className="h-4 w-4"
										fill="currentColor"
										viewBox="0 0 24 24"
										aria-hidden="true"
									>
										<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
									</svg>
								</a>
								<a
									href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${siteConfig.url}/writing/${post.slug}`)}`}
									target="_blank"
									rel="noopener noreferrer"
									className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
								>
									<span className="sr-only">Share on LinkedIn</span>
									<svg
										className="h-4 w-4"
										fill="currentColor"
										viewBox="0 0 24 24"
										aria-hidden="true"
									>
										<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
									</svg>
								</a>
								<button
									type="button"
									onClick={handleCopyLink}
									className="cursor-pointer rounded-md p-2 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
									title="Copy link"
								>
									<Link2 className="h-4 w-4" />
								</button>
							</div>
						</div>
					</header>

					<MarkdownContent markdown={post.content} />

					<footer className="mt-12 flex flex-col items-start justify-between gap-4 border-foreground/20 border-t pt-8 sm:flex-row sm:items-center">
						<Link
							to="/writing"
							className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
						>
							<Undo2 className="h-4 w-4" />
							Back to writing
						</Link>
					</footer>
				</article>
			</div>
			<Toaster position="bottom-center" />
		</div>
	);
}
