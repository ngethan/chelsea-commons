import { Link, createFileRoute } from "@tanstack/react-router";
import { Download, Link2, Undo2 } from "lucide-react";
import { useMemo } from "react";
import { Toaster, toast } from "sonner";
import { Streamdown } from "streamdown";
import { TableOfContents } from "../components/blog/table-of-contents";
import { CustomToast } from "../components/custom-toast";
import { buildSeoTags, siteConfig } from "../site-config";
import { extractHeadings, generateSlug } from "../utils/markdown";

interface BlogFrontmatter {
	title: string;
	date: string;
	excerpt: string;
	tags: string[];
	readTime: string;
	ogImage?: string;
}

export const Route = createFileRoute("/writing/$slug")({
	loader: async ({ params }) => {
		const fm = (await import("front-matter")).default;
		const modules = import.meta.glob("../../content/blog/*.md", {
			query: "?raw",
			import: "default",
			eager: true,
		});

		const path = `../../content/blog/${params.slug}.md`;
		const content = modules[path] as string | undefined;

		if (!content) {
			return { post: undefined };
		}

		const { attributes, body } = fm<BlogFrontmatter>(content);

		return {
			post: {
				slug: params.slug,
				title: attributes.title,
				date: attributes.date,
				excerpt: attributes.excerpt,
				tags: attributes.tags,
				readTime: attributes.readTime,
				ogImage: attributes.ogImage,
				content: body,
			},
		};
	},
	head: ({ loaderData }) => {
		return buildSeoTags({
			title: `${loaderData?.post?.title || "Post"} | THE CHELSEA COMMONS`,
			description: loaderData?.post?.excerpt || "Blog post",
			path: `/writing/${loaderData?.post?.slug || ""}`,
			imagePath: loaderData?.post?.ogImage,
		});
	},
	component: BlogPost,
});

function BlogPost() {
	const { post } = Route.useLoaderData();

	const headings = useMemo(() => {
		if (!post?.content) return [];
		return extractHeadings(post.content);
	}, [post?.content]);

	const handleCopyLink = () => {
		navigator.clipboard.writeText(`${siteConfig.url}/writing/${post?.slug}`);
		toast.custom(() => <CustomToast message="Link copied to clipboard!" />);
	};

	if (!post) {
		return (
			<div className="min-h-dvh text-muted-foreground relative z-10">
				<div className="max-w-2xl mx-auto px-6 py-12 md:py-24 text-center">
					<h1 className="text-2xl mb-4">Post not found</h1>
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

	return (
		<div className="min-h-dvh text-muted-foreground relative z-10">
			<TableOfContents headings={headings} />

			<Link
				to="/writing"
				className="fixed top-6 left-6 md:top-36 md:left-24 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors z-20"
			>
				<Undo2 className="w-4 h-4" />
				Writing
			</Link>

			<div className="max-w-2xl mx-auto px-6 py-12 md:py-24">
				<article className="space-y-8">
					<header className="space-y-4 border-b border-foreground/20 pb-6">
						<h1 className="text-3xl md:text-4xl font-medium text-foreground leading-tight">
							{post.title}
						</h1>
						<div className="flex items-center justify-between gap-4">
							<time className="text-sm text-muted-foreground">{post.date}</time>
							<div className="flex items-center gap-1">
								<a
									href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(`${siteConfig.url}/writing/${post.slug}`)}`}
									target="_blank"
									rel="noopener noreferrer"
									className="p-2 rounded-md hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors"
								>
									<span className="sr-only">Share on Twitter</span>
									<svg
										className="w-4 h-4"
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
									className="p-2 rounded-md hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors"
								>
									<span className="sr-only">Share on LinkedIn</span>
									<svg
										className="w-4 h-4"
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
									className="p-2 rounded-md hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
									title="Copy link"
								>
									<Link2 className="w-4 h-4" />
								</button>
							</div>
						</div>
					</header>

					<div className="prose prose-invert prose-neutral max-w-none prose-headings:text-foreground prose-strong:text-foreground prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground">
						<Streamdown
							components={{
								img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
									<div
										className="group relative my-6 inline-block"
										data-streamdown="image-wrapper"
									>
										<img
											{...props}
											alt={props.alt || ""}
											className="max-w-full rounded-lg"
											data-streamdown="image"
										/>
										<button
											className="absolute right-2 bottom-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-border bg-background/90 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-background opacity-0 group-hover:opacity-100"
											title="Download image"
											type="button"
										>
											<Download className="w-4 h-4" />
										</button>
									</div>
								),
								hr: () => (
									<hr
										className="my-8 border-foreground/20"
										data-streamdown="horizontal-rule"
									/>
								),
								strong: ({ children }) => (
									<strong
										className="font-semibold"
										style={{ color: "var(--semi-foreground)" }}
									>
										{children}
									</strong>
								),
								h1: ({ children }) => {
									const text = typeof children === "string" ? children : "";
									const id = generateSlug(text);
									return (
										<h1
											id={id}
											className="mt-10 mb-4 font-semibold text-3xl text-foreground scroll-mt-24"
											data-streamdown="heading-1"
										>
											{children}
										</h1>
									);
								},
								h2: ({ children }) => {
									const text = typeof children === "string" ? children : "";
									const id = generateSlug(text);
									return (
										<h2
											id={id}
											className="mt-10 mb-4 font-semibold text-2xl text-foreground scroll-mt-24"
											data-streamdown="heading-2"
										>
											{children}
										</h2>
									);
								},
								h3: ({ children }) => (
									<h3
										className="mt-8 mb-3 font-semibold text-xl text-foreground"
										data-streamdown="heading-3"
									>
										{children}
									</h3>
								),
								h4: ({ children }) => (
									<h4
										className="mt-6 mb-2 font-semibold text-lg text-foreground"
										data-streamdown="heading-4"
									>
										{children}
									</h4>
								),
								h5: ({ children }) => (
									<h5
										className="mt-6 mb-2 font-semibold text-base text-foreground"
										data-streamdown="heading-5"
									>
										{children}
									</h5>
								),
								h6: ({ children }) => (
									<h6
										className="mt-6 mb-2 font-semibold text-sm text-foreground"
										data-streamdown="heading-6"
									>
										{children}
									</h6>
								),
							}}
						>
							{post.content}
						</Streamdown>
					</div>

					<footer className="border-t border-foreground/20 pt-8 mt-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
						<Link
							to="/writing"
							className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							<Undo2 className="w-4 h-4" />
							Back to writing
						</Link>

						<div className="flex items-center gap-2">
							<span className="text-sm text-muted-foreground mr-2">Share:</span>
							<a
								href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(`${siteConfig.url}/writing/${post.slug}`)}`}
								target="_blank"
								rel="noopener noreferrer"
								className="p-2 rounded-md hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors"
							>
								<span className="sr-only">Share on Twitter</span>
								<svg
									className="w-4 h-4"
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
								className="p-2 rounded-md hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors"
							>
								<span className="sr-only">Share on LinkedIn</span>
								<svg
									className="w-4 h-4"
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
								className="p-2 rounded-md hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
								title="Copy link"
							>
								<Link2 className="w-4 h-4" />
							</button>
						</div>
					</footer>
				</article>
			</div>

			<Toaster position="bottom-center" />
		</div>
	);
}
