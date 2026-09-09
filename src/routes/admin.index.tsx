import { createFileRoute, redirect } from "@tanstack/react-router";

/** The list you almost always want is the people. */
export const Route = createFileRoute("/admin/")({
	beforeLoad: () => {
		throw redirect({ to: "/admin/contacts" });
	},
});
