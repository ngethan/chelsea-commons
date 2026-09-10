import { FilterBar, organizationFilter } from "@/components/admin/filter-bar";
import { usePocs } from "@/components/admin/pocs";
import { Empty, Mono, StatusText } from "@/components/admin/primitives";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { CONTACT_STATUSES, STATUS_LABEL, normalizeStatus } from "@/lib/status";
import { toast } from "@/lib/toast";
import { trpc } from "@/trpc/client";
import { Check, UserRound } from "lucide-react";
import { useMemo, useState } from "react";

/**
 * Who gets this update. The same search-or-filter as the Contacts page, so
 * "everyone committed" or "everyone Will knows" is two clicks rather than a
 * scroll through a checklist; people who already hold a link are shown as
 * sent rather than offered again; and the button says how many it will do.
 */
export function RecipientsPicker({
	updateId,
	updateTitle,
	linkedContactIds,
	onClose,
}: {
	updateId: string;
	updateTitle: string;
	linkedContactIds: string[];
	onClose: () => void;
}) {
	const utils = trpc.useUtils();
	const contacts = trpc.contacts.list.useQuery();
	const [picked, setPicked] = useState<Set<string>>(new Set());
	const [q, setQ] = useState("");
	const [statuses, setStatuses] = useState<string[]>([]);
	const [pocs, setPocs] = useState<string[]>([]);
	const [orgs, setOrgs] = useState<string[]>([]);

	const all = contacts.data ?? [];
	const linked = useMemo(() => new Set(linkedContactIds), [linkedContactIds]);

	const roster = usePocs();
	const pocOptions = useMemo(() => {
		const options = roster.users.map((u) => ({ value: u.id, label: u.name }));
		const known = new Set(options.map((o) => o.value));
		const stray = new Set<string>();
		for (const row of all)
			for (const value of row.pocs) if (!known.has(value)) stray.add(value);
		return [
			...options,
			...[...stray].sort().map((name) => ({ value: name, label: name })),
		];
	}, [all, roster.users]);

	const rows = useMemo(() => {
		const needle = q.trim().toLowerCase();
		return all.filter((row) => {
			if (statuses.length && !statuses.includes(normalizeStatus(row.status)))
				return false;
			if (pocs.length && !row.pocs.some((p) => pocs.includes(p))) return false;
			if (orgs.length && !orgs.includes(row.organizationId ?? "")) return false;
			if (!needle) return true;
			return [row.name, row.email, row.title, row.organizationName, ...row.tags]
				.filter(Boolean)
				.some((field) => String(field).toLowerCase().includes(needle));
		});
	}, [all, q, statuses, pocs, orgs]);

	const create = trpc.links.createForContacts.useMutation({
		onSuccess: async (result) => {
			await Promise.all([
				utils.updates.byId.invalidate({ id: updateId }),
				utils.updates.list.invalidate(),
				utils.contacts.list.invalidate(),
			]);
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

	const selectable = rows.filter((row) => !linked.has(row.id));
	const allShownPicked =
		selectable.length > 0 && selectable.every((row) => picked.has(row.id));

	function toggleShown() {
		setPicked((prev) => {
			const next = new Set(prev);
			if (allShownPicked) for (const row of selectable) next.delete(row.id);
			else for (const row of selectable) next.add(row.id);
			return next;
		});
	}

	return (
		<Sheet open onOpenChange={(open) => !open && onClose()}>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>Add recipients</SheetTitle>
					<SheetDescription>{updateTitle}</SheetDescription>
				</SheetHeader>

				<SheetBody className="p-0">
					<div className="flex flex-wrap items-center gap-2 border-b border-border px-8 py-3">
						<FilterBar
							q={q}
							onQ={setQ}
							filters={[
								{
									key: "status",
									label: "Status",
									value: statuses,
									onChange: setStatuses,
									options: CONTACT_STATUSES.map((s) => ({
										value: s,
										label: STATUS_LABEL[s],
									})),
								},
								{
									key: "poc",
									label: "POC",
									icon: UserRound,
									value: pocs,
									onChange: setPocs,
									options: pocOptions,
								},
								organizationFilter(all, orgs, setOrgs),
							]}
						/>
					</div>

					{contacts.isLoading && <Empty>Loading.</Empty>}
					{!contacts.isLoading && rows.length === 0 && (
						<Empty>Nothing matches that.</Empty>
					)}

					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[64px] px-0 [&>*]:mx-auto">
									<Checkbox
										aria-label="Select everybody shown"
										checked={allShownPicked}
										disabled={selectable.length === 0}
										onCheckedChange={toggleShown}
									/>
								</TableHead>
								<TableHead>Person</TableHead>
								<TableHead className="hidden w-[180px] sm:table-cell">
									Organization
								</TableHead>
								<TableHead className="w-[140px] pr-8 text-right">
									Status
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.map((row) => {
								const sent = linked.has(row.id);
								return (
									<TableRow
										key={row.id}
										className={sent ? "opacity-55" : "cursor-pointer"}
										data-state={picked.has(row.id) ? "selected" : undefined}
										onClick={() => !sent && toggle(row.id)}
									>
										<TableCell className="w-[64px] px-0 [&>*]:mx-auto">
											{sent ? (
												<Check className="size-4 text-muted-foreground" />
											) : (
												<Checkbox
													checked={picked.has(row.id)}
													onCheckedChange={() => toggle(row.id)}
													onClick={(e) => e.stopPropagation()}
													aria-label={`Include ${row.name || row.email || "contact"}`}
												/>
											)}
										</TableCell>
										<TableCell>
											<div className="truncate text-[14px]">
												{row.name || row.email || "Unnamed"}
											</div>
											{row.name && row.email && (
												<Mono className="block truncate">{row.email}</Mono>
											)}
										</TableCell>
										<TableCell className="hidden w-[180px] truncate text-[12.5px] text-muted-foreground sm:table-cell">
											{row.organizationName ?? ""}
										</TableCell>
										<TableCell className="w-[140px] pr-8 text-right text-[12.5px]">
											{sent ? (
												<span className="text-muted-foreground">
													has a link
												</span>
											) : (
												<StatusText status={row.status} />
											)}
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</SheetBody>

				<SheetFooter>
					{picked.size > 0 && (
						<Button variant="ghost" onClick={() => setPicked(new Set())}>
							Clear
						</Button>
					)}
					<Button
						disabled={picked.size === 0 || create.isPending}
						onClick={() => create.mutate({ updateId, contactIds: [...picked] })}
					>
						{create.isPending
							? "Adding"
							: picked.size
								? `Add ${picked.size}`
								: "Add"}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
