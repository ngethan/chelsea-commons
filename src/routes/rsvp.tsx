import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/rsvp")({
	beforeLoad: () => {
		throw redirect({
			href: "https://docs.google.com/forms/u/0/d/17pYCdAHFwEmf9offsVGZztE-l0zdUfaGVYgJpXw__o8/viewform?edit_requested=true",
		});
	},
});
