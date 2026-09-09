import { AdminShell } from "@/components/admin/shell";
import { readSidebarOpen } from "@/lib/sidebar-state";
import { buildSeoTags } from "@/site-config";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

/**
 * The admin's only entrance.
 *
 * Two tiers, and only one of them is a boundary. This `beforeLoad` decides
 * whether to render the shell or send you to sign in, which is a courtesy: it
 * runs in the browser as well as on the server and nothing stops a determined
 * caller from skipping it. The boundary is `protectedProcedure`, which every
 * piece of data behind this screen goes through.
 */
export const Route = createFileRoute("/admin")({
	beforeLoad: async ({ context, location }) => {
		const user = await context.api.auth.session.query();
		if (!user) {
			throw redirect({
				to: "/sign-in",
				search: { next: location.href },
			});
		}
		return { user, sidebarOpen: readSidebarOpen() };
	},
	head: () => ({
		...buildSeoTags({
			title: "Admin | Chelsea Commons",
			description: "Admin.",
			path: "/admin",
			robots: "noindex, nofollow",
		}),
		styles: [
			{
				// The site's paper grain rides above everything at z-90. It is the
				// right texture for a letter and the wrong one for a table of forty
				// names, so it stops at the admin's door.
				children: "body::after{display:none}",
			},
		],
	}),
	component: AdminLayout,
});

function AdminLayout() {
	const { user, sidebarOpen } = Route.useRouteContext();

	return (
		<AdminShell
			defaultOpen={sidebarOpen}
			user={{
				name: user.name,
				email: user.email,
				image: user.image ?? null,
			}}
		>
			<Outlet />
		</AdminShell>
	);
}
