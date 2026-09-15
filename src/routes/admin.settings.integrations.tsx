import {
	ListTable,
	Mono,
	Page,
	PageScroll,
	RowsSkeleton,
	TableFoot,
	Tinted,
} from "@/components/admin/primitives";
import { RowMenu } from "@/components/admin/row-menu";
import { SettingsHead } from "@/components/admin/settings-head";
import { useDrawerParam } from "@/components/admin/use-drawer-param";
import { ConfirmButton } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetBody,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { AppRouter } from "@/server/trpc/root";
import { trpc } from "@/trpc/client";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { inferRouterOutputs } from "@trpc/server";
import { Plug, Unplug } from "lucide-react";
import { useEffect } from "react";
import { z } from "zod";

/**
 * Each person's own Google grants. Connecting leaves the app for Google's
 * consent screen (`/api/integrations/<provider>/start`) and comes back here
 * with `connected` or `error` in the URL, which is toasted once and cleared.
 */
export const Route = createFileRoute("/admin/settings/integrations")({
	head: () => ({ meta: [{ title: "Admin | Settings" }] }),
	validateSearch: z.object({
		sheet: z.string().optional(),
		connected: z.string().optional(),
		error: z.string().optional(),
	}),
	component: IntegrationsPage,
});

type Row = inferRouterOutputs<AppRouter>["integrations"]["list"][number];

const LOGO = { gmail: "/integrations/gmail.svg" } as const;

/** The one control column: 160px, its content centred, the gutter overridden. */
const ACTION_COL = "w-40 px-0! text-center";

/**
 * The product's own mark in a circle, at the sizes a face takes in the same
 * places (`PersonAvatar` md beside a two-line row, xl in a drawer head).
 */
function Logo({ row, size }: { row: Row; size: "md" | "xl" }) {
	return (
		<span
			className={cn(
				"flex shrink-0 items-center justify-center rounded-full border border-border bg-secondary",
				size === "md" ? "size-9" : "size-14",
			)}
		>
			<img
				src={LOGO[row.provider]}
				alt=""
				className={size === "md" ? "w-4" : "w-6"}
			/>
		</span>
	);
}

function messageFor(code: string): string {
	if (code === "access_denied") return "Nothing was connected.";
	if (code === "state") return "That link was stale. Try again.";
	if (code === "exchange") return "Google did not complete the connection.";
	return `Google answered: ${code}`;
}

function connect(provider: string) {
	window.location.assign(`/api/integrations/${provider}/start`);
}

const day = (value: Date | string) =>
	new Date(value).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});

function State({ row }: { row: Row }) {
	if (!row.connectedAt) return <Tinted tone="neutral">Not connected</Tinted>;
	if (row.stale) return <Tinted tone="warning">Reconnect</Tinted>;
	return <Tinted tone="success">Connected</Tinted>;
}

/** Disconnect, shared by the row, the row menu and the drawer. */
function useDisconnect(onDone?: () => void) {
	const utils = trpc.useUtils();
	return trpc.integrations.disconnect.useMutation({
		onSuccess: async () => {
			await utils.integrations.list.invalidate();
			toast.success("Disconnected.");
			onDone?.();
		},
		onError: (err) => toast.error(err.message),
	});
}

const disconnectCopy = (label: string) => ({
	title: `Disconnect ${label}?`,
	description:
		"This app stops being able to read the account, and the grant is revoked at Google.",
	action: "Disconnect",
});

function IntegrationsPage() {
	const { connected, error } = Route.useSearch();
	const navigate = useNavigate();
	const sheet = useDrawerParam("sheet");
	const list = trpc.integrations.list.useQuery();
	const rows = list.data ?? [];
	const live = rows.filter((row) => row.connectedAt && !row.stale);
	const disconnect = useDisconnect();

	useEffect(() => {
		if (!connected && !error) return;
		if (connected) {
			const label = rows.find((r) => r.provider === connected)?.label;
			toast.success(`${label ?? "Integration"} connected.`);
		}
		if (error) toast.error(messageFor(error));
		// Clear it, so a refresh does not re-announce a result from earlier.
		navigate({ to: ".", search: {}, replace: true });
	}, [connected, error, rows, navigate]);

	return (
		<Page>
			<SettingsHead />

			<PageScroll>
				<ListTable>
					<TableHeader>
						<TableRow>
							<TableHead>Integration</TableHead>
							{/* Fixed and centred: a control, not text, so no grip and no gutter. */}
							<TableHead className={ACTION_COL}>Action</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{list.isLoading && (
							<RowsSkeleton rows={1} cells={["person", "text"]} />
						)}
						{rows.map((row) => (
							<RowMenu
								key={row.provider}
								actions={[
									{
										label: row.connectedAt ? "Reconnect" : "Connect",
										icon: Plug,
										onSelect: () => connect(row.provider),
									},
									"separator",
									{
										label: "Disconnect",
										icon: Unplug,
										disabled: !row.connectedAt,
										onSelect: () => sheet.open(row.provider),
									},
								]}
							>
								<TableRow
									className="cursor-pointer"
									onClick={() => sheet.open(row.provider)}
								>
									<TableCell>
										<div className="flex items-center gap-2.5">
											<Logo row={row} size="md" />
											<div className="min-w-0">
												<div className="truncate font-medium">{row.label}</div>
												{row.email && (
													<Mono className="mt-0.5 block truncate text-[12px]">
														{row.email}
													</Mono>
												)}
											</div>
										</div>
									</TableCell>
									<TableCell
										className={ACTION_COL}
										onClick={(e) => e.stopPropagation()}
									>
										{row.connectedAt ? (
											<ConfirmButton
												{...disconnectCopy(row.label)}
												onConfirm={() =>
													disconnect.mutate({ provider: row.provider })
												}
											>
												<Button
													size="sm"
													variant="outline"
													disabled={disconnect.isPending}
												>
													Disconnect
												</Button>
											</ConfirmButton>
										) : (
											<Button size="sm" onClick={() => connect(row.provider)}>
												Connect
											</Button>
										)}
									</TableCell>
								</TableRow>
							</RowMenu>
						))}
					</TableBody>
				</ListTable>
			</PageScroll>

			<TableFoot shown={rows.length} total={rows.length} noun="integrations">
				<span>{live.length} connected</span>
			</TableFoot>

			{sheet.value && (
				<IntegrationSheet
					row={rows.find((row) => row.provider === sheet.value)}
					onClose={sheet.close}
				/>
			)}
		</Page>
	);
}

/**
 * One integration: which account granted, what it may read, and since
 * when. Nothing here is typed, so the footer is the whole of what can
 * happen to it: connect again, or take it away.
 */
function IntegrationSheet({
	row,
	onClose,
}: {
	row: Row | undefined;
	onClose: () => void;
}) {
	const disconnect = useDisconnect(onClose);

	return (
		<Sheet open onOpenChange={(open) => !open && onClose()}>
			<SheetContent className="max-w-[520px]">
				<SheetHeader className="flex-row items-center gap-4">
					{row && <Logo row={row} size="xl" />}
					<div className="flex min-w-0 flex-col gap-1.5">
						<SheetTitle className="truncate">{row?.label ?? ""}</SheetTitle>
						<SheetDescription className="flex items-center gap-2">
							{row && <State row={row} />}
							{row?.email && (
								<>
									<span className="text-muted-foreground/50">·</span>
									<Mono className="text-[13px]">{row.email}</Mono>
								</>
							)}
						</SheetDescription>
					</div>
				</SheetHeader>
				<SheetBody className="flex flex-col gap-8">
					{row && (
						<div className="border border-border">
							<Table>
								<TableBody>
									<TableRow className="hover:bg-transparent">
										<TableCell className="w-[140px] pl-4 text-muted-foreground">
											Account
										</TableCell>
										<TableCell>
											{row.email ? (
												<Mono className="text-[13px]">{row.email}</Mono>
											) : (
												""
											)}
										</TableCell>
									</TableRow>
									<TableRow className="hover:bg-transparent">
										<TableCell className="pl-4 text-muted-foreground">
											Access
										</TableCell>
										<TableCell>
											{row.scopes.map((s) => s.label).join(", ")}
										</TableCell>
									</TableRow>
									<TableRow className="hover:bg-transparent">
										<TableCell className="pl-4 text-muted-foreground">
											Connected
										</TableCell>
										<TableCell className="tabular-nums">
											{row.connectedAt ? day(row.connectedAt) : "Never"}
										</TableCell>
									</TableRow>
								</TableBody>
							</Table>
						</div>
					)}
				</SheetBody>
				<SheetFooter>
					{row?.connectedAt && (
						<ConfirmButton
							{...disconnectCopy(row.label)}
							onConfirm={() => disconnect.mutate({ provider: row.provider })}
						>
							<Button
								type="button"
								variant="outline"
								disabled={disconnect.isPending}
							>
								<Unplug />
								Disconnect
							</Button>
						</ConfirmButton>
					)}
					{row && (
						<Button type="button" onClick={() => connect(row.provider)}>
							<Plug />
							{row.connectedAt ? "Reconnect" : "Connect"}
						</Button>
					)}
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
