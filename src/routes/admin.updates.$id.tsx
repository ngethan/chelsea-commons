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
import { ConfirmButton, ConfirmDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
	Sheet,
	SheetBody,
	SheetContent,
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
import { trpc } from "@/trpc/client";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Link2Off, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { z } from "zod";

export const Route = createFileRoute("/admin/updates/$id")({
	validateSearch: z.object({ sheet: z.enum(["recipients"]).optional() }),
	component: UpdateDetail,
});

const when = (value: Date | string | null) =>
	value
		? new Date(value).toLocaleString("en-US", {
				month: "short",
				day: "numeric",
				hour: "numeric",
				minute: "2-digit",
			})
		: "—";

function UpdateDetail() {
	const { id } = Route.useParams();
	const sheet = useDrawerParam("sheet");
	const utils = trpc.useUtils();
	const detail = trpc.updates.byId.useQuery({ id });
	const [revoking, setRevoking] = useState<string | null>(null);

	const revoke = trpc.links.revoke.useMutation({
		onSuccess: async () => {
			await utils.updates.byId.invalidate({ id });
			toast.success("Revoked.");
		},
		onError: (err) => toast.error(err.message),
	});

	const recipients = detail.data?.recipients ?? [];
	const opened = recipients.filter((row) => row.clicks > 0).length;

	function copyLink(ref: string) {
		navigator.clipboard.writeText(`${window.location.origin}/u/${ref}`);
		toast.success("Copied.");
	}

	function copyAll() {
		const origin = window.location.origin;
		const lines = recipients
			.filter((row) => !row.revokedAt)
			.map((row) => `${row.contactEmail ?? ""}\t${origin}/u/${row.ref}`);
		navigator.clipboard.writeText(lines.join("\n"));
		toast.success(`${lines.length} copied, one per line.`);
	}

	return (
		<Page>
			<PageHead
				title={detail.data?.update.title ?? "Update"}
				meta={
					detail.data ? (
						<Mono className="text-[12.5px]">
							/writing/{detail.data.update.slug}
						</Mono>
					) : undefined
				}
				actions={
					<>
						<Button variant="outline" onClick={copyAll}>
							Copy all
						</Button>
						<Button onClick={() => sheet.open("recipients")}>Add people</Button>
					</>
				}
			/>

			<PageScroll>
				<ListTable>
					<TableHeader>
						<TableRow>
							<TableHead>Person</TableHead>
							<TableHead className="w-[140px]">Link</TableHead>
							<TableHead className="w-[90px] text-right">Opens</TableHead>
							<TableHead className="hidden w-[160px] text-right md:table-cell">
								First open
							</TableHead>
							<TableHead className="w-[96px]" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{detail.isLoading && <RowsSkeleton rows={6} cols={5} />}
						{recipients.map((row) => (
							<RowMenu
								key={row.id}
								actions={[
									{
										label: "Copy link",
										icon: Copy,
										disabled: Boolean(row.revokedAt),
										onSelect: () => copyLink(row.ref),
									},
									{
										label: "Open contact",
										icon: UserRound,
										onSelect: () =>
											window.location.assign(
												`/admin/contacts?contact=${row.contactId}`,
											),
									},
									"separator",
									{
										label: "Revoke link",
										icon: Link2Off,
										disabled: Boolean(row.revokedAt),
										onSelect: () => setRevoking(row.id),
									},
								]}
							>
								<TableRow className={row.revokedAt ? "opacity-55" : ""}>
									<TableCell>
										<div className="truncate">
											{row.contactName || row.contactEmail || "Unnamed"}
										</div>
										{row.contactName && (
											<Mono className="mt-0.5 block truncate text-[12px]">
												{row.contactEmail}
											</Mono>
										)}
									</TableCell>
									<TableCell>
										<Mono className="text-[12.5px]">{row.ref}</Mono>
									</TableCell>
									<TableCell className="text-right tabular-nums">
										{row.clicks}
									</TableCell>
									<TableCell className="hidden text-right text-muted-foreground tabular-nums md:table-cell">
										{when(row.firstClickAt)}
									</TableCell>
									<TableCell className="text-right">
										{row.revokedAt ? (
											<Tinted tone="neutral" className="text-[12.5px]">
												revoked
											</Tinted>
										) : (
											<div className="flex items-center justify-end gap-0.5">
												<Button
													variant="icon"
													size="icon-xs"
													title="Copy link"
													onClick={() => copyLink(row.ref)}
												>
													<Copy />
													<span className="sr-only">Copy link</span>
												</Button>
												<ConfirmButton
													title="Revoke this link?"
													description="It answers 404 from then on, the same as a link that never existed. Their past opens are kept."
													action="Revoke"
													onConfirm={() => revoke.mutate({ id: row.id })}
												>
													<Button
														variant="icon"
														size="icon-xs"
														title="Revoke link"
													>
														<Link2Off />
														<span className="sr-only">Revoke link</span>
													</Button>
												</ConfirmButton>
											</div>
										)}
									</TableCell>
								</TableRow>
							</RowMenu>
						))}
					</TableBody>
				</ListTable>

				{!detail.isLoading && recipients.length === 0 && (
					<Empty>Nobody yet.</Empty>
				)}
			</PageScroll>

			<TableFoot
				shown={recipients.length}
				total={recipients.length}
				noun="recipients"
			>
				<span>{opened} opened</span>
			</TableFoot>

			<ConfirmDialog
				open={revoking !== null}
				onOpenChange={(open) => !open && setRevoking(null)}
				title="Revoke this link?"
				description="It answers 404 from then on, the same as a link that never existed. Their past opens are kept."
				action="Revoke"
				onConfirm={() => {
					if (revoking) revoke.mutate({ id: revoking });
					setRevoking(null);
				}}
			/>

			{sheet.value === "recipients" && (
				<AddRecipients updateId={id} onClose={sheet.close} />
			)}
		</Page>
	);
}

function AddRecipients({
	updateId,
	onClose,
}: {
	updateId: string;
	onClose: () => void;
}) {
	const utils = trpc.useUtils();
	const contacts = trpc.contacts.list.useQuery();
	const [picked, setPicked] = useState<Set<string>>(new Set());
	const [filter, setFilter] = useState("");

	const rows = useMemo(() => {
		const all = contacts.data ?? [];
		const needle = filter.trim().toLowerCase();
		if (!needle) return all;
		return all.filter((row) =>
			[row.name, row.email, row.organizationName]
				.filter(Boolean)
				.some((field) => String(field).toLowerCase().includes(needle)),
		);
	}, [contacts.data, filter]);

	const create = trpc.links.createForContacts.useMutation({
		onSuccess: async (result) => {
			await utils.updates.byId.invalidate({ id: updateId });
			await utils.updates.list.invalidate();
			toast.success(
				result.existing > 0
					? `${result.created} added, ${result.existing} already had one.`
					: `${result.created} added.`,
			);
			onClose();
		},
		onError: (err) => toast.error(err.message),
	});

	function toggle(id: string) {
		setPicked((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	return (
		<Sheet open onOpenChange={(open) => !open && onClose()}>
			<SheetContent aria-describedby={undefined}>
				<SheetHeader>
					<SheetTitle>Add people</SheetTitle>
				</SheetHeader>

				<SheetBody className="p-0">
					<div className="border-b border-border px-8 py-4">
						<Input
							value={filter}
							onChange={(e) => setFilter(e.target.value)}
							placeholder="Filter"
							autoFocus
						/>
					</div>
					<Table>
						<TableBody>
							{rows.map((row) => (
								<TableRow
									key={row.id}
									className="cursor-pointer"
									data-state={picked.has(row.id) ? "selected" : undefined}
									onClick={() => toggle(row.id)}
								>
									<TableCell className="w-[56px] pl-8">
										<Checkbox
											checked={picked.has(row.id)}
											onCheckedChange={() => toggle(row.id)}
											onClick={(e) => e.stopPropagation()}
											aria-label={`Include ${row.name || row.email || "contact"}`}
										/>
									</TableCell>
									<TableCell>
										<div className="truncate text-[14px]">
											{row.name || row.email || "Unnamed"}
										</div>
										{row.name && (
											<Mono className="block truncate">{row.email}</Mono>
										)}
									</TableCell>
									<TableCell className="pr-8 text-right text-[12px] text-muted-foreground">
										{row.organizationName ?? ""}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</SheetBody>

				<SheetFooter>
					<Button
						variant="ghost"
						onClick={() => setPicked(new Set(rows.map((row) => row.id)))}
					>
						Select all {rows.length}
					</Button>
					<Button
						disabled={picked.size === 0 || create.isPending}
						onClick={() => create.mutate({ updateId, contactIds: [...picked] })}
					>
						{create.isPending ? "Adding" : `Add ${picked.size || ""}`.trim()}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
