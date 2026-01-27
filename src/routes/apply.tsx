import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/apply")({
	beforeLoad: () => {
		throw redirect({
			href: "https://docs.google.com/forms/d/e/1FAIpQLSfNAkbsg63FeITIly22gKZf155IrA9UUbXNNH48dR3hEpdD9A/viewform",
		});
	},
});
