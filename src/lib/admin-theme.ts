/**
 * The admin is dark and the site is cream, and this is the whole of the
 * switch. `__root.tsx` reads it to put `dark` on `<html>` and to paint the
 * document ground before any stylesheet has loaded.
 *
 * `/sign-in` counts as the admin: it is the door to it, it shares its
 * controls, and a cream page between a dark sign-out and a dark sign-in reads
 * as a flash of the wrong site.
 */
export function isAdminPath(pathname: string): boolean {
	return pathname.startsWith("/admin") || pathname.startsWith("/sign-in");
}

/** `--background` from the `.dark` block in `styles.css`, for inline paint. */
export const ADMIN_GROUND = "oklch(0.22 0 0)";
