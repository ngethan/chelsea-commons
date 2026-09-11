import { PersonAvatar } from "@/components/admin/person-avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Search, Settings } from "lucide-react";

type Viewer = {
	id: string;
	name: string;
	email: string;
	image: string | null;
};

/**
 * The bar across the top of the content: search on the left, the account
 * on the right, and the page starts under it with room to breathe.
 */
export function Topbar({
	user,
	onSearch,
}: {
	user: Viewer;
	onSearch: () => void;
}) {
	const navigate = useNavigate();

	async function signOut() {
		await authClient.signOut();
		await navigate({ to: "/sign-in" });
	}

	return (
		// h-14 matches the rail's own header, so one rule crosses both panes
		// rather than two that nearly line up.
		<header className="grid h-14 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b border-border px-4 md:px-8">
			{/* The rail is a sheet on a phone, and this is its handle. */}
			<div>
				<SidebarTrigger className="-ml-1.5 md:hidden" />
			</div>

			{/* Centred in the bar, and the one rounded control on the page: it
			    is the door to a floating surface rather than a field in one. */}
			<button
				type="button"
				onClick={onSearch}
				className="flex h-9 w-[min(560px,60vw)] cursor-text items-center gap-2.5 rounded-md border border-input bg-card px-3 text-left text-[13px] text-muted-foreground transition-colors hover:border-input-focus"
			>
				<Search className="size-3.5 shrink-0" />
				<span className="flex-1 truncate">Search for anything</span>
				<KbdGroup>
					<Kbd>⌘</Kbd>
					<Kbd>K</Kbd>
				</KbdGroup>
			</button>

			<div className="flex items-center justify-end gap-1">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="icon" size="icon-sm" aria-label="Account">
							<PersonAvatar person={user} />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-[220px]">
						<DropdownMenuLabel className="font-normal">
							<div className="truncate text-[13px] font-medium">
								{user.name}
							</div>
							<div className="truncate font-mono text-[11px] text-muted-foreground">
								{user.email}
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem asChild>
							<Link to="/admin/settings" className="no-underline">
								<Settings />
								Settings
							</Link>
						</DropdownMenuItem>
						<DropdownMenuItem onSelect={signOut}>
							<LogOut />
							Sign out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</header>
	);
}
