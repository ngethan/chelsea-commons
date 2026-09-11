import { AskDrawer, useAskShortcut } from "@/components/admin/ask/chat";
import { useAsk } from "@/components/admin/ask/use-ask";
import {
	CommandMenu,
	useCommandShortcut,
} from "@/components/admin/command-menu";
import { Topbar } from "@/components/admin/topbar";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { Link, useRouterState } from "@tanstack/react-router";
import {
	Building2,
	CreativeCommons,
	FileText,
	KeyRound,
	Users,
} from "lucide-react";
import type * as React from "react";
import { useCallback, useState } from "react";

/**
 * Four items, and deliberately no counts beside them: a number on the rail
 * that disagrees with the page it points at is worse than no number.
 */
const NAV = [
	{ to: "/admin/contacts", label: "Contacts", icon: Users },
	{ to: "/admin/organizations", label: "Organizations", icon: Building2 },
	{ to: "/admin/updates", label: "Updates", icon: FileText },
	{ to: "/admin/access", label: "Access", icon: KeyRound },
] as const;

/**
 * The frame: a rail on the left, a bar across the top, and the page under
 * both. The rail is only navigation; search and the account live in the
 * bar, where the eye goes first.
 */
export function AdminShell({
	user,
	children,
	defaultOpen = true,
}: {
	user: { id: string; name: string; email: string; image: string | null };
	children: React.ReactNode;
	/** Starting state of the rail. The trigger and cmd+B drive it after that. */
	defaultOpen?: boolean;
}) {
	// The rail follows the page, not the click. `location` moves the instant
	// a link is pressed; `resolvedLocation` moves when the new route's code
	// and pending state have settled, which is when the screen changes. A
	// rail that lights the next item while the last page is still showing
	// reads as a broken page rather than a slow one.
	const pathname = useRouterState({
		select: (s) => (s.resolvedLocation ?? s.location).pathname,
	});
	const [commandOpen, setCommandOpen] = useState(false);
	const openCommand = useCallback(() => setCommandOpen(true), []);
	useCommandShortcut(openCommand);

	// The conversation lives here rather than in the drawer so a turn keeps
	// running while the drawer is closed to look at the table it changed.
	const [askOpen, setAskOpen] = useState(false);
	const openAsk = useCallback(() => setAskOpen(true), []);
	useAskShortcut(openAsk);
	const ask = useAsk();

	return (
		<SidebarProvider
			defaultOpen={defaultOpen}
			className="relative z-10 h-screen min-h-0"
		>
			<Sidebar collapsible="icon">
				{/* h-14 matches the topbar, so the rule under both is one line
				    across the whole window rather than two that nearly meet. */}
				<SidebarHeader className="relative h-14 shrink-0 flex-row items-center justify-between border-b border-sidebar-border px-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
					{/* The wordmark is the house number. Three letters fit the icon
					    rail where a name does not, so it survives the collapse, and
					    while the rail is collapsed it gives way to the trigger on
					    hover: the one control a 48px strip has to keep reachable. */}
					<Link
						to="/"
						className="font-serif text-[15px] uppercase tracking-[0.22em] no-underline transition-opacity duration-100 group-data-[collapsible=icon]:text-[13px] group-data-[collapsible=icon]:tracking-[0.18em] group-data-[collapsible=icon]:group-focus-within:opacity-0 group-data-[collapsible=icon]:group-hover:opacity-0"
					>
						XII
					</Link>
					<SidebarTrigger
						/**
						 * Hidden until the rail is hovered. `group` is the Sidebar root,
						 * which contains both the spacer and the fixed rail, so hovering
						 * anywhere on the rail reveals it. Kept focusable and revealed on
						 * focus, or it would be a control a keyboard could reach but
						 * never see. cmd+B works regardless. Collapsed, it sits exactly
						 * where the wordmark was.
						 */
						className="rounded-full opacity-0 transition-opacity duration-100 focus-visible:opacity-100 group-hover:opacity-100 group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:top-1/2 group-data-[collapsible=icon]:left-1/2 group-data-[collapsible=icon]:-translate-x-1/2 group-data-[collapsible=icon]:-translate-y-1/2"
					/>
				</SidebarHeader>

				<SidebarContent>
					<SidebarGroup className="p-2">
						<SidebarMenu>
							{NAV.map((item) => (
								<SidebarMenuItem key={item.to}>
									<SidebarMenuButton
										asChild
										isActive={pathname.startsWith(item.to)}
										tooltip={item.label}
										// The row you are on is the bright one. Everything else
										// on the rail sits back a step.
										className="text-muted-foreground data-[active=true]:text-foreground hover:text-foreground"
									>
										<Link
											to={item.to}
											preload="intent"
											className="no-underline"
										>
											<item.icon />
											<span>{item.label}</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroup>
				</SidebarContent>

				<SidebarFooter className="border-t border-sidebar-border p-2">
					{/* At the foot rather than among the four lists: it is not a
					    place things live, it is a way of reaching all of them. */}
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton
								onClick={openAsk}
								isActive={askOpen}
								tooltip="Ask AI"
								className="text-muted-foreground data-[active=true]:text-foreground hover:text-foreground"
							>
								<CreativeCommons />
								<span className="flex-1">Ask AI</span>
								<KbdGroup className="group-data-[collapsible=icon]:hidden">
									<Kbd>⌘</Kbd>
									<Kbd>J</Kbd>
								</KbdGroup>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarFooter>
			</Sidebar>

			{/* SidebarInset renders the <main>, so `admin-main` goes on it and the
			    page owns its scroller: a <main> inside a <main> is invalid, and
			    it broke the `main.admin-main` rule that turns off the site's
			    prose link styling in here. */}
			<SidebarInset className="admin-main min-h-0 min-w-0 overflow-hidden bg-background">
				<Topbar user={user} onSearch={openCommand} />
				{children}
			</SidebarInset>

			<CommandMenu
				open={commandOpen}
				onOpenChange={setCommandOpen}
				onAsk={openAsk}
			/>
			<AskDrawer open={askOpen} onOpenChange={setAskOpen} ask={ask} />

			{/* Outside the scroll container and outside any grid. Sonner's wrapper
			    is a static <section>, so where it is mounted affects layout even
			    though the toast list itself is position: fixed: as a grid child it
			    becomes a row of its own, which is what shortened the sign-in page. */}
			<Toaster />
		</SidebarProvider>
	);
}
