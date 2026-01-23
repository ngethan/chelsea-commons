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
			<main className="px-6 md:px-12">
				<h1 className="text-foreground text-3xl font-medium">Events</h1>
			</main>
		</div>
	);
}
