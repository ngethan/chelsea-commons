import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "../components/Navbar";
import { buildSeoTags } from "../site-config";

export const Route = createFileRoute("/events")({
	head: () =>
		buildSeoTags({
			title: "Events - Chelsea Commons",
			description: "Chelsea Commons Events",
			path: "/events",
		}),
	component: Events,
});

function Events() {
	return (
		<div className="min-h-dvh relative z-10">
			<Navbar />
			<main className="flex flex-col items-center justify-center min-h-[calc(100dvh-72px)] px-6 md:px-12">
				<h1 className="text-foreground text-4xl md:text-5xl font-medium mb-4">Events</h1>
				<p className="text-muted-foreground text-lg">Coming soon</p>
			</main>
		</div>
	);
}
