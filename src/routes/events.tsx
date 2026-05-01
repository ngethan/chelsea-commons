import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Navbar } from "../components/Navbar";
import { buildSeoTags } from "../site-config";

export const Route = createFileRoute("/events")({
	head: () => {
		const seo = buildSeoTags({
			title: "Events - THE CHELSEA COMMONS",
			description:
				"Join exclusive dinners, networking events, and intern mixers throughout Summer 2026 in NYC",
			path: "/events",
		});
		return {
			title: seo.title,
			meta: seo.meta,
			links: seo.links,
		};
	},
	component: Events,
});

function Events() {
	return (
		<div className="min-h-dvh relative z-10">
			<Navbar />
			<main className="flex flex-col items-center justify-center min-h-[calc(100dvh-72px)] px-6 md:px-12">
				<div className="text-center max-w-2xl">
					<motion.h1
						initial={{ opacity: 0, y: 15 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
						className="text-foreground text-5xl md:text-6xl font-serif italic mb-6"
					>
						Events & Mixers
					</motion.h1>

					<motion.p
						initial={{ opacity: 0, y: 15 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.4, ease: "easeOut", delay: 0.15 }}
						className="text-muted-foreground text-lg md:text-xl leading-relaxed mb-8"
					>
						We're planning a series of exclusive events, dinners, and intern
						mixers throughout the summer. Stay tuned for announcements.
					</motion.p>

					<motion.div
						initial={{ opacity: 0, y: 15 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
					>
						<a
							href="https://docs.google.com/forms/u/0/d/17pYCdAHFwEmf9offsVGZztE-l0zdUfaGVYgJpXw__o8/viewform?edit_requested=true"
							target="_blank"
							rel="noopener noreferrer"
						>
							<Button size="xl">Register for Events</Button>
						</a>
					</motion.div>
				</div>
			</main>
		</div>
	);
}
