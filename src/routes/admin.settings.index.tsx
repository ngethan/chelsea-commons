import { createFileRoute, redirect } from "@tanstack/react-router";

/** One section for now, so the settings page is that section. */
export const Route = createFileRoute("/admin/settings/")({
	beforeLoad: () => {
		throw redirect({ to: "/admin/settings/users" });
	},
});
