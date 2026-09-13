/**
 * What somebody on the roster is allowed to do. Its own module so the
 * schema, the procedures and the pages read one list.
 *
 * Four roles, top down. An owner runs the house: invites anybody, changes
 * anybody's role, revokes and restores. An admin can bring people in as
 * members or viewers and nothing more. A member works the lists. A viewer
 * reads them. The difference is enforced in three places and no others:
 * `protectedProcedure` refuses a viewer's mutations, `adminProcedure`
 * admits owners and admins, `ownerProcedure` admits owners.
 */
export const ROLES = ["owner", "admin", "member", "viewer"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
	owner: "Owner",
	admin: "Admin",
	member: "Member",
	viewer: "Viewer",
};

/** The role a new invite gets when nobody chose one. */
export const DEFAULT_ROLE: Role = "member";

export function isRole(value: unknown): value is Role {
	return (
		typeof value === "string" && (ROLES as readonly string[]).includes(value)
	);
}

/** Owner or admin. What `adminProcedure` asks, in one place. */
export function isAdmin(role: Role | null | undefined): boolean {
	return role === "owner" || role === "admin";
}

/** Who sees the Users page at all. */
export function canManageUsers(role: Role | null | undefined): boolean {
	return isAdmin(role);
}

/** Who can change what somebody else is: their role, their access. */
export function canEditPeople(role: Role | null | undefined): boolean {
	return role === "owner";
}

/** The roles this person may hand out on an invite or a change. */
export function assignableRoles(role: Role | null | undefined): Role[] {
	if (role === "owner") return [...ROLES];
	if (role === "admin") return ["member", "viewer"];
	return [];
}
