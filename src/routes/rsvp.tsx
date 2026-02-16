import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/rsvp")({
	beforeLoad: () => {
		throw redirect({
			href: "https://chelsea-commons.notion.site/2fd5b71c112f8015bfeadf423ee983c2?pvs=105",
		});
	},
});
