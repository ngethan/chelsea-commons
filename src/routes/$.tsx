import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { buildSeoTags } from "../site-config";

export const Route = createFileRoute("/$")({
	head: () =>
		buildSeoTags({
			title: "404 - Page Not Found | Chelsea Commons",
			description: "The page you're looking for doesn't exist.",
			path: "/404",
		}),
	component: NotFound,
});

function NotFound() {
	return (
		<div className="min-h-svh flex items-center justify-center px-6 relative z-10">
			<motion.div
				initial={{ opacity: 0, y: 15 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4, ease: "easeOut" }}
				className="flex flex-col items-center justify-center space-y-6 text-center w-full max-w-lg"
			>
				<div className="relative w-full overflow-hidden aspect-[13/5]">
					<img
						src="/assets/creation-of-adam.png"
						alt="Two hands reaching toward each other but not quite touching, after Michelangelo's Creation of Adam"
						className="absolute inset-0 h-full w-full object-cover"
					/>
				</div>
				<div className="space-y-3">
					<h1 className="font-serif italic text-6xl md:text-8xl text-foreground">
						404
					</h1>
					<p className="text-xl md:text-2xl text-foreground">
						Nothing at this address.
					</p>
				</div>
				<p className="text-sm text-muted-foreground leading-relaxed">
					The page you're looking for doesn't exist or has moved.
				</p>
				<Link
					to="/"
					className="text-sm text-foreground hover:text-muted-foreground transition-colors duration-300 border-b border-foreground hover:border-muted-foreground"
				>
					← Back to home
				</Link>
			</motion.div>
		</div>
	);
}
