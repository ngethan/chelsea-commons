import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/rsvp")({
	beforeLoad: () => {
		throw redirect({
			href: "https://forms.gle/egVYYDzUneAMXrpu7",
		});
	},
});
