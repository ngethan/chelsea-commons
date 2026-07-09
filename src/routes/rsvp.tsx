import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/rsvp")({
	beforeLoad: () => {
		throw redirect({
			href: "https://docs.google.com/forms/d/17pYCdAHFwEmf9offsVGZztE-l0zdUfaGVYgJpXw__o8/viewform",
		});
	},
});
