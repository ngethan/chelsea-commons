import { AdminShell } from "@/components/admin/shell";
import { readSidebarOpen } from "@/lib/sidebar-state";
import { buildSeoTags } from "@/site-config";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { useRef } from "react";
import type { RouterContext } from "./__root";

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
	beforeLoad: async ({ context, location, cause }) => {
		const user = await sessionFor(context.api, cause);
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

type Api = RouterContext["api"];
type Viewer = NonNullable<Awaited<ReturnType<Api["auth"]["session"]["query"]>>>;

/**
 * The session, once per visit rather than once per URL.
 *
 * `beforeLoad` runs on every navigation under this route, and a search
 * param change is a navigation: typing into a filter field re-asked the
 * server who was signed in on each keystroke. On the client the answer is
 * kept for a minute and reused for "stay" navigations, which are the ones
 * that only changed the query string. Entering the admin, and every
 * server-side render, still asks. Kept in module scope on the client only:
 * on the server that scope is shared between requests.
 */
let remembered: { at: number; user: Viewer | null } | null = null;
const REMEMBER_FOR = 60_000;

async function sessionFor(
	api: Api,
	cause: "enter" | "stay" | "preload",
): Promise<Viewer | null> {
	const client = typeof window !== "undefined";
	if (
		client &&
		cause === "stay" &&
		remembered &&
		Date.now() - remembered.at < REMEMBER_FOR
	) {
		return remembered.user;
	}
	const user = await api.auth.session.query();
	if (client) remembered = { at: Date.now(), user };
	return user;
}

function AdminLayout() {
	const context = Route.useRouteContext();

	// While a navigation is in flight the pending match's context can arrive
	// before `beforeLoad` has filled it. The shell keeps the last viewer it
	// was given rather than unmounting for a frame, which is what turned a
	// keystroke in a filter field into a crashed page.
	const last = useRef(context.user);
	if (context.user) last.current = context.user;
	const user = last.current;
	if (!user) return null;

	return (
		<AdminShell
			defaultOpen={context.sidebarOpen ?? true}
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
