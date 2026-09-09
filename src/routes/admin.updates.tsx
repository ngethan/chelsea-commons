import {
	Empty,
	ListTable,
	Mono,
	Page,
	PageHead,
	PageScroll,
	RowsSkeleton,
	TableFoot,
	Tinted,
} from "@/components/admin/primitives";
import { RowMenu } from "@/components/admin/row-menu";
import { useDrawerParam } from "@/components/admin/use-drawer-param";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetBody,
	SheetContent,
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
import { trpc } from "@/trpc/client";
import {
	Outlet,
	createFileRoute,
	useMatches,
	useNavigate,
} from "@tanstack/react-router";
import { ExternalLink, FileText, Link as LinkIcon, Trash2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

export const Route = createFileRoute("/admin/updates")({
	validateSearch: z.object({ sheet: z.enum(["new"]).optional() }),
	component: Updates,
});

function Updates() {
	// The detail view is a page, not a drawer: it is a wide table with a copy
	// action per row, and 720px is not where that belongs.
	const isDetail = useMatches().some((match) =>
		match.routeId.startsWith("/admin/updates/$"),
	);
	if (isDetail) return <Outlet />;

	return <UpdatesList />;
}

function UpdatesList() {
	const navigate = useNavigate();
	const utils = trpc.useUtils();
	const sheet = useDrawerParam("sheet");
	const list = trpc.updates.list.useQuery();
	const rows = list.data ?? [];
	const [removing, setRemoving] = useState<string | null>(null);

	const remove = trpc.updates.remove.useMutation({
		onSuccess: async () => {
			await Promise.all([
				utils.updates.list.invalidate(),
				utils.updates.availablePosts.invalidate(),
			]);
			toast.success("Deleted.");
		},
		onError: (err) => toast.error(err.message),
	});

	function copy(text: string, what: string) {
		navigator.clipboard.writeText(text);
		toast.success(`${what} copied.`);
	}

	const openUpdate = (id: string) =>
		navigate({ to: "/admin/updates/$id", params: { id } });

	return (
		<Page>
			<PageHead
				title="Updates"
				actions={<Button onClick={() => sheet.open("new")}>New</Button>}
			/>

			<PageScroll>
				<ListTable>
					<TableHeader>
						<TableRow>
							<TableHead>Update</TableHead>
							<TableHead className="hidden w-[280px] md:table-cell">
								Slug
							</TableHead>
							<TableHead className="w-[110px] text-right">Sent to</TableHead>
							<TableHead className="w-[110px] text-right">Opened</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{list.isLoading && <RowsSkeleton rows={4} cols={4} />}
						{rows.map((row) => (
							<RowMenu
								key={row.id}
								actions={[
									{
										label: "Open",
										icon: FileText,
										onSelect: () => openUpdate(row.id),
									},
									{
										label: "Copy public link",
										icon: ExternalLink,
										onSelect: () =>
											copy(
												`${window.location.origin}/writing/${row.slug}`,
												"Link",
											),
									},
									{
										label: "Copy link to record",
										icon: LinkIcon,
										onSelect: () =>
											copy(
												`${window.location.origin}/admin/updates/${row.id}`,
												"Link",
											),
									},
									"separator",
									{
										label: "Delete",
										icon: Trash2,
										onSelect: () => setRemoving(row.id),
									},
								]}
							>
								<TableRow
									className="cursor-pointer"
									onClick={() => openUpdate(row.id)}
								>
									<TableCell className="truncate font-medium">
										{row.title}
									</TableCell>
									<TableCell className="hidden md:table-cell">
										<Mono className="truncate text-[12.5px]">{row.slug}</Mono>
									</TableCell>
									<TableCell className="text-right text-muted-foreground tabular-nums">
										{row.recipients}
									</TableCell>
									<TableCell className="text-right tabular-nums">
										{row.opened}
									</TableCell>
								</TableRow>
							</RowMenu>
						))}
					</TableBody>
				</ListTable>

				{!list.isLoading && rows.length === 0 && <Empty>Nothing yet.</Empty>}
			</PageScroll>

			<TableFoot shown={rows.length} total={rows.length} noun="updates" />

			<ConfirmDialog
				open={removing !== null}
				onOpenChange={(open) => !open && setRemoving(null)}
				title="Delete this update?"
				description="Only possible while nobody has a link to it. Once links are out, an update is a record rather than a draft."
				action="Delete"
				onConfirm={() => {
					if (removing) remove.mutate({ id: removing });
					setRemoving(null);
				}}
			/>

			{sheet.value === "new" && <NewUpdate onClose={sheet.close} />}
		</Page>
	);
}

function NewUpdate({ onClose }: { onClose: () => void }) {
	const utils = trpc.useUtils();
	const posts = trpc.updates.availablePosts.useQuery();

	const create = trpc.updates.create.useMutation({
		onSuccess: async () => {
			await Promise.all([
				utils.updates.list.invalidate(),
				utils.updates.availablePosts.invalidate(),
			]);
			toast.success("Created. Now pick who it goes to.");
			onClose();
		},
		onError: (err) => toast.error(err.message),
	});

	return (
		<Sheet open onOpenChange={(open) => !open && onClose()}>
			<SheetContent className="max-w-[560px]" aria-describedby={undefined}>
				<SheetHeader>
					<SheetTitle>New update</SheetTitle>
				</SheetHeader>
				<SheetBody className="p-0">
					{posts.isLoading && <Empty>Loading.</Empty>}
					<Table>
						<TableBody>
							{(posts.data ?? []).map((post) => (
								<TableRow key={post.slug}>
									<TableCell className="pl-8">
										<div className="truncate text-[14px]">{post.name}</div>
										<Mono className="mt-0.5 block truncate">{post.slug}</Mono>
									</TableCell>
									<TableCell className="w-[96px]">
										{post.visibility === "private" && (
											<Tinted tone="neutral" className="text-[12px]">
												unlisted
											</Tinted>
										)}
									</TableCell>
									<TableCell className="w-[96px] pr-8 text-right">
										{post.used ? (
											<span className="text-[12px] text-muted-foreground">
												added
											</span>
										) : (
											<Button
												size="xs"
												variant="outline"
												disabled={create.isPending}
												onClick={() => create.mutate({ slug: post.slug })}
											>
												Use
											</Button>
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</SheetBody>
			</SheetContent>
		</Sheet>
	);
}
