import { PageHead } from "@/components/admin/primitives";
import { canManageUsers } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { Link, useRouteContext } from "@tanstack/react-router";
import type * as React from "react";

/**
 * The settings are one page with sections. Today there is one, Users, so
 * the head is the title and the section's own control (Invite); the pills
 * under the title appear the day a second section does, the way a filter
 * row sits under a list's.
 */
const SECTIONS = [
	{ label: "Users", to: "/admin/settings/users", show: canManageUsers },
] as const;

export function SettingsHead({ actions }: { actions?: React.ReactNode }) {
	const { user } = useRouteContext({ from: "/admin" });
	const sections = SECTIONS.filter((s) => s.show(user?.role));

	return (
		<PageHead
			title="Settings"
			actions={actions}
			toolbar={
				sections.length > 1 ? (
					<nav aria-label="Settings" className="flex items-center gap-0.5">
						{sections.map((section) => (
							<Link
								key={section.to}
								to={section.to}
								activeOptions={{ exact: true }}
								preload="intent"
								className={cn(
									"flex h-7 items-center rounded-full px-3 text-[12.5px] no-underline transition-colors",
									"text-muted-foreground hover:bg-hover-muted hover:text-foreground",
									"data-[status=active]:bg-secondary data-[status=active]:text-foreground",
								)}
							>
								{section.label}
							</Link>
						))}
					</nav>
				) : undefined
			}
		/>
	);
}
