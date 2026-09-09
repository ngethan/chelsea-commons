import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { LucideIcon } from "lucide-react";
import type * as React from "react";

export type RowAction =
	| {
			label: string;
			icon?: LucideIcon;
			onSelect: () => void;
			disabled?: boolean;
	  }
	| "separator";

/**
 * Right-click on a table row.
 *
 * A row's click opens it, and that is all a click can do; everything else a
 * row could offer (copy the address, copy a link to the record, remove it)
 * was either a trip into the drawer or nowhere. This puts those under the
 * pointer without adding a column of icons to every row. Radix sets
 * `data-state` on the trigger, so the row stays lit while its menu is open.
 */
export function RowMenu({
	actions,
	children,
}: {
	actions: RowAction[];
	children: React.ReactElement;
}) {
	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
			<ContextMenuContent>
				{actions.map((action, index) =>
					action === "separator" ? (
						<ContextMenuSeparator key={`sep-${index}`} />
					) : (
						<ContextMenuItem
							key={action.label}
							disabled={action.disabled}
							onSelect={action.onSelect}
						>
							{action.icon && <action.icon />}
							{action.label}
						</ContextMenuItem>
					),
				)}
			</ContextMenuContent>
		</ContextMenu>
	);
}
