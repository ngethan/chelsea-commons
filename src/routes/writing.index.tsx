import { fetchPublicPosts } from "@/lib/posts-server";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { buildSeoTags } from "../site-config";

const DESCRIPTION = "Thoughts on building, technology, and design.";

export const Route = createFileRoute("/writing/")({
	head: () =>
		buildSeoTags({
			title: "Writing | Chelsea Commons",
			description: DESCRIPTION,
			path: "/writing",
		}),
	// Only public posts, and only their summary fields. Goes through a server
	// function so no post content reaches the browser bundle; see
	// src/lib/posts-server.ts.
	loader: async () => await fetchPublicPosts(),
	component: BlogIndex,
});

function BlogIndex() {
	const posts = Route.useLoaderData()?.posts ?? [];

	return (
		<div className="relative z-10 min-h-svh text-muted-foreground">
			<Link
				to="/"
				className="fixed top-6 left-6 z-20 inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground md:top-12 md:left-12"
			>
				<ArrowLeft className="h-4 w-4" />
				Back
			</Link>

			<div className="mx-auto max-w-2xl px-6 py-12 md:py-24">
				<div className="space-y-12">
					<div className="space-y-2">
						<h1 className="font-medium text-4xl text-foreground">Writing</h1>
						<p className="text-muted-foreground">{DESCRIPTION}</p>
					</div>

					<div className="space-y-6">
						{posts.length === 0 && (
							<p className="py-6 text-muted-foreground">
								Nothing published yet.
							</p>
						)}
						{posts.map((post) => (
							<Link
								key={post.slug}
								to="/writing/$slug"
								params={{ slug: post.slug }}
								className="group block no-underline"
							>
								<article className="space-y-2 border-foreground/20 border-b py-6 transition-all duration-300 group-hover:border-foreground/50">
									<div className="flex flex-wrap items-baseline justify-between gap-4">
										<h2 className="font-medium text-foreground text-xl transition-colors group-hover:text-foreground">
											{post.name}
										</h2>
										<time className="flex-shrink-0 text-muted-foreground text-sm">
											{post.date}
										</time>
									</div>

									<p className="text-muted-foreground leading-relaxed">
										{post.description}
									</p>

									{/* Boolean(): with tags: [] and no readTime this is the
									    number 0, which React renders as literal text. */}
									{Boolean(post.readTime || post.tags?.length) && (
										<div className="flex flex-wrap items-center gap-2 pt-1 text-muted-foreground text-xs">
											{post.readTime && <span>{post.readTime}</span>}
											{post.readTime && post.tags?.length ? (
												<span>·</span>
											) : null}
											{post.tags?.map((tag) => (
												<span
													key={tag}
													className="rounded bg-foreground/5 px-2 py-0.5 text-muted-foreground"
												>
													{tag}
												</span>
											))}
										</div>
									)}
								</article>
							</Link>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
