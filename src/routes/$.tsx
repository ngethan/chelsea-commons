import { Link, createFileRoute } from "@tanstack/react-router";
import { buildSeoTags } from "../site-config";

export const Route = createFileRoute("/$")({
	head: () =>
		buildSeoTags({
			title: "404 - Page Not Found | THE CHELSEA COMMONS",
			description: "The page you're looking for doesn't exist.",
			path: "/404",
		}),
	component: NotFound,
});

function NotFound() {
	return (
		<div className="min-h-dvh text-muted-foreground flex items-center justify-center px-6 relative z-10">
			<div className="flex flex-col items-center justify-center space-y-6 text-center max-w-lg">
				<div className="space-y-2">
					<h1 className="text-6xl md:text-8xl font-bold text-foreground">
						404
					</h1>
					<p className="text-xl md:text-2xl text-muted-foreground">
						Page not found
					</p>
				</div>
				<p className="text-sm text-muted-foreground">
					The page you're looking for doesn't exist or has been moved.
				</p>
				<Link
					to="/"
					className="text-sm text-foreground hover:text-muted-foreground transition-colors duration-300 border-b border-foreground hover:border-muted-foreground"
				>
					← Back to home
				</Link>
			</div>
		</div>
	);
}
