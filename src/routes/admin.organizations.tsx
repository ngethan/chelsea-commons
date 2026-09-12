import { FilterBar } from "@/components/admin/filter-bar";
import {
	Empty,
	H2,
	ListTable,
	Mono,
	Page,
	PageHead,
	PageScroll,
	RowsSkeleton,
	StatusText,
	TableFoot,
} from "@/components/admin/primitives";
import { RowMenu } from "@/components/admin/row-menu";
import { useUnsavedGuard } from "@/components/admin/unsaved-guard";
import { useDrawerParam } from "@/components/admin/use-drawer-param";
import { ConfirmButton, ConfirmDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	FloatingInput,
	FloatingTextarea,
} from "@/components/ui/floating-field";
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
import { trpc } from "@/trpc/client";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, Copy, Link as LinkIcon, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

export const Route = createFileRoute("/admin/organizations")({
	validateSearch: z.object({
		org: z.string().optional(),
		sheet: z.enum(["new"]).optional(),
		q: z.string().optional(),
	}),
	component: Organizations,
});

function Organizations() {
	const { q } = Route.useSearch();
	const navigate = Route.useNavigate();
	const org = useDrawerParam("org");
	const sheet = useDrawerParam("sheet");
	const utils = trpc.useUtils();
	const list = trpc.organizations.list.useQuery();
	const rows = list.data ?? [];
	const [removing, setRemoving] = useState<string | null>(null);

	const needle = (q ?? "").trim().toLowerCase();
	const filtered = needle
		? rows.filter((row) =>
				[row.name, row.domain]
					.filter(Boolean)
					.some((field) => String(field).toLowerCase().includes(needle)),
			)
		: rows;

	const remove = trpc.organizations.remove.useMutation({
		onSuccess: async () => {
			await Promise.all([
				utils.organizations.list.invalidate(),
				utils.contacts.list.invalidate(),
			]);
			toast.success("Deleted. The people are still on the list.");
		},
		onError: (err) => toast.error(err.message),
	});

	function copy(text: string, what: string) {
		navigator.clipboard.writeText(text);
		toast.success(`${what} copied.`);
	}

	return (
		<Page>
			<PageHead
				title="Organizations"
				toolbar={
					<FilterBar
						q={q ?? ""}
						onQ={(value) =>
							navigate({
								search: (prev) => ({ ...prev, q: value || undefined }),
								replace: true,
							})
						}
					/>
				}
				actions={<Button onClick={() => sheet.open("new")}>Add</Button>}
			/>

			<PageScroll>
				<ListTable>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead className="w-[260px]">Domain</TableHead>
							<TableHead className="w-[110px] text-right">People</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{list.isLoading && <RowsSkeleton rows={6} cols={3} />}
						{filtered.map((row) => (
							<RowMenu
								key={row.id}
								actions={[
									{
										label: "Open",
										icon: Building2,
										onSelect: () => org.open(row.id),
									},
									{
										label: "Copy domain",
										icon: Copy,
										disabled: !row.domain,
										onSelect: () => row.domain && copy(row.domain, "Domain"),
									},
									{
										label: "Copy link to record",
										icon: LinkIcon,
										onSelect: () =>
											copy(
												`${window.location.origin}/admin/organizations?org=${row.id}`,
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
									onClick={() => org.open(row.id)}
								>
									<TableCell className="truncate font-medium">
										{row.name}
									</TableCell>
									<TableCell>
										<Mono className="truncate text-[12.5px]">
											{row.domain ?? "—"}
										</Mono>
									</TableCell>
									<TableCell className="text-right text-muted-foreground tabular-nums">
										{row.contacts}
									</TableCell>
								</TableRow>
							</RowMenu>
						))}
					</TableBody>
				</ListTable>

				{!list.isLoading && filtered.length === 0 && (
					<Empty>{q ? "Nothing matches that." : "None yet."}</Empty>
				)}
			</PageScroll>

			<TableFoot
				shown={filtered.length}
				total={rows.length}
				noun="organizations"
			/>

			<ConfirmDialog
				open={removing !== null}
				onOpenChange={(open) => !open && setRemoving(null)}
				title="Delete this organization?"
				description="Everybody filed here stays on the list, they just stop being filed anywhere."
				action="Delete"
				onConfirm={() => {
					if (removing) remove.mutate({ id: removing });
					setRemoving(null);
				}}
			/>

			{org.value && <OrganizationDrawer id={org.value} onClose={org.close} />}
			{sheet.value === "new" && <NewOrganization onClose={sheet.close} />}
		</Page>
	);
}

type Draft = { name: string; domain: string; notes: string };

function OrganizationDrawer({
	id,
	onClose,
}: {
	id: string;
	onClose: () => void;
}) {
	const utils = trpc.useUtils();
	const navigate = useNavigate();
	const detail = trpc.organizations.byId.useQuery({ id });
	const [seed, setSeed] = useState<Draft | null>(null);
	const [draft, setDraft] = useState<Draft | null>(null);

	useEffect(() => {
		const row = detail.data?.organization;
		if (!row) return;
		const next = {
			name: row.name,
			domain: row.domain ?? "",
			notes: row.notes ?? "",
		};
		setSeed(next);
		setDraft(next);
	}, [detail.data?.organization]);

	const dirty =
		draft !== null &&
		seed !== null &&
		JSON.stringify(draft) !== JSON.stringify(seed);
	const guard = useUnsavedGuard(dirty, onClose);

	const save = trpc.organizations.update.useMutation({
		onSuccess: async () => {
			await Promise.all([
				utils.organizations.list.invalidate(),
				utils.organizations.byId.invalidate({ id }),
			]);
			toast.success("Saved.");
		},
		onError: (err) => toast.error(err.message),
	});

	const remove = trpc.organizations.remove.useMutation({
		onSuccess: async () => {
			await Promise.all([
				utils.organizations.list.invalidate(),
				utils.contacts.list.invalidate(),
			]);
			toast.success("Deleted. The people are still on the list.");
			onClose();
		},
		onError: (err) => toast.error(err.message),
	});

	const members = detail.data?.members ?? [];

	return (
		<Sheet open onOpenChange={(open) => !open && guard.requestClose()}>
			<SheetContent onOpenAutoFocus={(e) => e.preventDefault()}>
				<SheetHeader>
					<SheetTitle>
						{detail.data?.organization.name ?? "Organization"}
					</SheetTitle>
					<SheetDescription className="flex items-center gap-2">
						{detail.data?.organization.domain && (
							<>
								<Mono className="text-[13px]">
									{detail.data.organization.domain}
								</Mono>
								<span className="text-muted-foreground/50">·</span>
							</>
						)}
						<span>{members.length} on the list</span>
					</SheetDescription>
				</SheetHeader>

				<SheetBody className="flex flex-col gap-10">
					{draft && (
						<section>
							<H2>Details</H2>
							<div className="grid grid-cols-2 gap-4">
								<FloatingInput
									label="Name"
									value={draft.name}
									onChange={(e) => setDraft({ ...draft, name: e.target.value })}
								/>
								<FloatingInput
									label="Domain"
									value={draft.domain}
									onChange={(e) =>
										setDraft({ ...draft, domain: e.target.value })
									}
								/>
								<FloatingTextarea
									label="Notes"
									className="col-span-2"
									value={draft.notes}
									onChange={(e) =>
										setDraft({ ...draft, notes: e.target.value })
									}
								/>
							</div>
						</section>
					)}

					<section>
						<H2>People</H2>
						{members.length === 0 && <Empty>Nobody yet.</Empty>}
						{members.length > 0 && (
							<div className="border border-border">
								<Table>
									<TableBody>
										{members.map((member) => (
											<TableRow
												key={member.id}
												className="cursor-pointer"
												onClick={() =>
													// The person's record is a page away, not a second
													// panel: leave for Contacts with them already open.
													navigate({
														to: "/admin/contacts",
														search: { contact: member.id },
													})
												}
											>
												<TableCell className="truncate text-[14px]">
													{member.name || member.email || "Unnamed"}
												</TableCell>
												<TableCell>
													<Mono>{member.email}</Mono>
												</TableCell>
												<TableCell className="w-[150px] text-right">
													<StatusText status={member.status} />
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						)}
					</section>
				</SheetBody>

				<SheetFooter>
					<ConfirmButton
						title="Delete this organization?"
						description="Everybody filed here stays on the list, they just stop being filed anywhere."
						action="Delete"
						onConfirm={() => remove.mutate({ id })}
					>
						<Button variant="outline">
							<Trash2 />
							Delete
						</Button>
					</ConfirmButton>
					<Button
						disabled={save.isPending || !dirty}
						onClick={() =>
							draft &&
							save.mutate({
								id,
								name: draft.name,
								domain: draft.domain || null,
								notes: draft.notes || null,
							})
						}
					>
						{save.isPending ? "Saving" : "Save"}
					</Button>
				</SheetFooter>

				{guard.dialog}
			</SheetContent>
		</Sheet>
	);
}

function NewOrganization({ onClose }: { onClose: () => void }) {
	const utils = trpc.useUtils();
	const [name, setName] = useState("");
	const [domain, setDomain] = useState("");
	const [notes, setNotes] = useState("");
	const guard = useUnsavedGuard(Boolean(name || domain || notes), onClose);

	const create = trpc.organizations.create.useMutation({
		onSuccess: async () => {
			await utils.organizations.list.invalidate();
			toast.success("Added.");
			onClose();
		},
		onError: (err) => toast.error(err.message),
	});

	return (
		<Sheet open onOpenChange={(open) => !open && guard.requestClose()}>
			<SheetContent className="max-w-[520px]" aria-describedby={undefined}>
				<SheetHeader>
					<SheetTitle>Add an organization</SheetTitle>
				</SheetHeader>
				<form
					className="flex min-h-0 flex-1 flex-col"
					onSubmit={(e) => {
						e.preventDefault();
						if (name.trim() && !create.isPending)
							create.mutate({
								name,
								domain: domain || null,
								notes: notes || null,
							});
					}}
				>
					<SheetBody className="flex flex-col gap-4">
						<FloatingInput
							label="Name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							autoFocus
						/>
						<FloatingInput
							label="Domain"
							value={domain}
							onChange={(e) => setDomain(e.target.value)}
						/>
						<FloatingTextarea
							label="Notes"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
						/>
					</SheetBody>
					<SheetFooter>
						<Button type="submit" disabled={create.isPending || !name.trim()}>
							{create.isPending ? "Adding" : "Add"}
						</Button>
					</SheetFooter>
				</form>
				{guard.dialog}
			</SheetContent>
		</Sheet>
	);
}
