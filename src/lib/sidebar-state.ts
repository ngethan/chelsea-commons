import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";

/**
 * shadcn's Sidebar writes `sidebar_state` on every toggle but never reads it
 * back: in its own Next examples a server component does that and passes
 * `defaultOpen`. Here the admin layout's `beforeLoad` is the equivalent seam.
 *
 * Read on both sides so the server renders the rail in the state the browser
 * is about to hydrate into. Reading it only on the client would either flash
 * the wrong width or, worse, mismatch the server's markup.
 */
const COOKIE = "sidebar_state";

export const readSidebarOpen = createIsomorphicFn()
	.client(() => {
		const match = document.cookie.match(
			new RegExp(`(?:^|; )${COOKIE}=([^;]*)`),
		);
		return match ? match[1] !== "false" : true;
	})
	.server(() => getCookie(COOKIE) !== "false");
