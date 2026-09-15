import { canManageUsers } from "@/lib/roles";
import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Two sections. The roster is the first for anybody who can open it; for
 * everybody else, settings begins at their own integrations.
 */
export const Route = createFileRoute("/admin/settings/")({
	beforeLoad: ({ context }) => {
		throw redirect({
			to: canManageUsers(context.user?.role)
				? "/admin/settings/users"
				: "/admin/settings/integrations",
		});
	},
});
