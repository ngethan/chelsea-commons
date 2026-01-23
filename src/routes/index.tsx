import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "../components/Navbar";
import { buildSeoTags } from "../site-config";

export const Route = createFileRoute("/")({
	head: () =>
		buildSeoTags({
			title: "Chelsea Commons",
			description: "Chelsea Commons",
			path: "/",
		}),
	component: App,
});

function App() {
	return (
		<div className="h-dvh relative z-10 flex flex-col">
			<Navbar />
			<main className="flex-1 flex flex-col justify-center px-6 md:px-12 pb-24">
				<div className="max-w-2xl">
					<h1 className="text-4xl md:text-6xl font-medium text-foreground leading-tight mb-6">
						A house for ambitious people in NYC this summer.
					</h1>
					<p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8">
						12-person house in Chelsea. Founders, operators, creatives, and
						interns building cool stuff and actually enjoying the summer
						together.
					</p>
					<p className="text-muted-foreground">5 spots left.</p>
				</div>
			</main>
		</div>
	);
}
