import { ContactDrawer } from "@/components/admin/contact-drawer";
import { DuplicatesSheet } from "@/components/admin/duplicates-sheet";
import { FilterBar } from "@/components/admin/filter-bar";
import { IssueUpdate } from "@/components/admin/issue-update";
import {
	Empty,
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
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	FloatingInput,
	FloatingTextarea,
} from "@/components/ui/floating-field";
import {
	Sheet,
	SheetBody,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { CONTACT_STATUSES, STATUS_LABEL, normalizeStatus } from "@/lib/status";
import { toast } from "@/lib/toast";
import { trpc } from "@/trpc/client";
import { createFileRoute } from "@tanstack/react-router";
import {
	Copy,
	FileText,
	Link as LinkIcon,
	Trash2,
	UserRound,
	Users,
	X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { z } from "zod";

const searchSchema = z.object({
	contact: z.string().optional(),
	sheet: z.enum(["new", "import"]).optional(),
	q: z.string().optional(),
	status: z.enum(CONTACT_STATUSES).optional(),
	poc: z.string().optional(),
});

export const Route = createFileRoute("/admin/contacts")({
	validateSearch: searchSchema,
	component: Contacts,
});

type Status = (typeof CONTACT_STATUSES)[number];

function Contacts() {
	const { q, status, poc } = Route.useSearch();
	const navigate = Route.useNavigate();
	const utils = trpc.useUtils();
	const contact = useDrawerParam("contact");
	const sheet = useDrawerParam("sheet");
	const [removing, setRemoving] = useState<string | null>(null);

	const list = trpc.contacts.list.useQuery();
	const rows = list.data ?? [];
	const duplicates = trpc.contacts.duplicates.useQuery();
	const [resolving, setResolving] = useState(false);

	// Rows ticked for a bulk action. Ids, not rows, so a selection survives
	// a refetch; it is cleared once the action has run.
	const [selected, setSelected] = useState<Set<string>>(new Set());
	function toggleSelected(id: string) {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	// Everybody who holds a relationship, for the filter's own list.
	const pocOptions = useMemo(() => {
		const seen = new Map<string, string>();
		for (const row of rows)
			for (const name of row.pocs)
				if (!seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name);
		return [...seen.values()]
			.sort((a, b) => a.localeCompare(b))
			.map((name) => ({ value: name, label: name }));
	}, [rows]);

	const remove = trpc.contacts.remove.useMutation({
		onSuccess: async () => {
			await utils.contacts.list.invalidate();
			toast.success("Deleted.");
		},
		onError: (err) => toast.error(err.message),
	});

	const filtered = useMemo(() => {
		const needle = (q ?? "").trim().toLowerCase();
		return rows.filter((row) => {
			if (status && normalizeStatus(row.status) !== status) return false;
			if (
				poc &&
				!row.pocs.some((name) => name.toLowerCase() === poc.toLowerCase())
			)
				return false;
			if (!needle) return true;
			return [
				row.name,
				row.email,
				row.title,
				row.organizationName,
				...row.tags,
				...row.pocs,
			]
				.filter(Boolean)
				.some((field) => String(field).toLowerCase().includes(needle));
		});
	}, [rows, q, status, poc]);

	function setQ(value: string) {
		navigate({
			search: (prev) => ({ ...prev, q: value || undefined }),
			replace: true,
		});
	}

	function setStatus(value: string | null) {
		navigate({
			search: (prev) => ({
				...prev,
				status: (value as Status | null) ?? undefined,
			}),
			replace: true,
		});
	}

	function setPoc(value: string | null) {
		navigate({
			search: (prev) => ({ ...prev, poc: value ?? undefined }),
			replace: true,
		});
	}

	function copy(text: string, what: string) {
		navigator.clipboard.writeText(text);
		toast.success(`${what} copied.`);
	}

	// A pointer resting on a row is usually about to click it. The drawer's
	// four queries are fetched then, so it opens full rather than filling in.
	function warm(id: string) {
		void utils.contacts.byId.prefetch({ id });
		void utils.interactions.byContact.prefetch({ contactId: id });
		void utils.links.byContact.prefetch({ contactId: id });
		void utils.contacts.timeline.prefetch({ id });
	}

	return (
		<Page>
			<PageHead
				title="Contacts"
				toolbar={
					<>
						<FilterBar
							q={q ?? ""}
							onQ={setQ}
							filters={[
								{
									key: "status",
									label: "Status",
									value: status ?? null,
									onChange: setStatus,
									options: CONTACT_STATUSES.map((s) => ({
										value: s,
										label: STATUS_LABEL[s],
									})),
								},
								{
									key: "poc",
									label: "POC",
									icon: UserRound,
									value: poc ?? null,
									onChange: setPoc,
									options: pocOptions,
								},
							]}
						/>
						{(duplicates.data?.length ?? 0) > 0 && (
							<Button
								variant="outline"
								size="sm"
								className="ml-auto"
								onClick={() => setResolving(true)}
							>
								<Users />
								{duplicates.data?.length} possible{" "}
								{duplicates.data?.length === 1 ? "duplicate" : "duplicates"}
							</Button>
						)}
					</>
				}
				actions={
					<>
						<Button variant="outline" onClick={() => sheet.open("import")}>
							Import
						</Button>
						<Button onClick={() => sheet.open("new")}>Add</Button>
					</>
				}
			/>

			<PageScroll>
				<ListTable>
					<TableHeader>
						<TableRow>
							<TableHead className="w-[52px]">
								<Checkbox
									aria-label="Select everybody shown"
									checked={
										filtered.length > 0 &&
										filtered.every((row) => selected.has(row.id))
									}
									onCheckedChange={(checked) =>
										setSelected((prev) => {
											const next = new Set(prev);
											for (const row of filtered) {
												if (checked) next.add(row.id);
												else next.delete(row.id);
											}
											return next;
										})
									}
								/>
							</TableHead>
							<TableHead>Person</TableHead>
							<TableHead className="hidden w-[220px] md:table-cell">
								Organization
							</TableHead>
							<TableHead className="w-[160px]">Status</TableHead>
							<TableHead className="hidden w-[180px] lg:table-cell">
								POCs
							</TableHead>
							<TableHead className="hidden w-[130px] text-right md:table-cell">
								Last touch
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{list.isLoading && <RowsSkeleton rows={8} cols={6} />}
						{filtered.map((row) => (
							<RowMenu
								key={row.id}
								actions={[
									{
										label: "Open",
										icon: UserRound,
										onSelect: () => contact.open(row.id),
									},
									{
										label: "Copy email",
										icon: Copy,
										disabled: !row.email,
										onSelect: () => row.email && copy(row.email, "Email"),
									},
									{
										label: "Copy link to record",
										icon: LinkIcon,
										onSelect: () =>
											copy(
												`${window.location.origin}/admin/contacts?contact=${row.id}`,
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
									data-state={selected.has(row.id) ? "selected" : undefined}
									onClick={() => contact.open(row.id)}
									onPointerEnter={() => warm(row.id)}
								>
									{/* The tick is its own target: a click here selects and
									    does not open. */}
									<TableCell
										className="w-[52px]"
										onClick={(e) => {
											e.stopPropagation();
											toggleSelected(row.id);
										}}
									>
										<Checkbox
											checked={selected.has(row.id)}
											onCheckedChange={() => toggleSelected(row.id)}
											onClick={(e) => e.stopPropagation()}
											aria-label={`Select ${row.name || row.email || "contact"}`}
										/>
									</TableCell>
									<TableCell>
										<div className="truncate font-medium">
											{row.name || row.email || "Unnamed"}
										</div>
										{(row.title || (row.name && row.email)) && (
											<div className="mt-0.5 flex items-center gap-1.5 truncate text-[12px] text-muted-foreground">
												{row.title && <span>{row.title}</span>}
												{row.title && row.name && row.email && (
													<span className="text-muted-foreground/50">·</span>
												)}
												{row.name && row.email && (
													<Mono className="text-[12px]">{row.email}</Mono>
												)}
											</div>
										)}
									</TableCell>
									<TableCell className="hidden truncate text-muted-foreground md:table-cell">
										{row.organizationName ?? "—"}
									</TableCell>
									<TableCell>
										<StatusText status={row.status} />
									</TableCell>
									<TableCell className="hidden truncate text-[12.5px] text-muted-foreground lg:table-cell">
										{row.pocs.length ? row.pocs.join(", ") : "—"}
									</TableCell>
									<TableCell className="hidden text-right text-[12.5px] text-muted-foreground tabular-nums md:table-cell">
										{row.lastTouch
											? new Date(row.lastTouch).toLocaleDateString("en-US", {
													month: "short",
													day: "numeric",
												})
											: "—"}
									</TableCell>
								</TableRow>
							</RowMenu>
						))}
					</TableBody>
				</ListTable>

				{!list.isLoading && filtered.length === 0 && (
					<Empty>
						{q || status || poc ? "Nothing matches that." : "Nobody yet."}
					</Empty>
				)}
			</PageScroll>

			{selected.size > 0 ? (
				<div className="flex h-12 shrink-0 items-center gap-3 border-t border-border bg-panel px-4 md:px-8">
					<Button
						variant="icon"
						size="icon-xs"
						aria-label="Clear selection"
						onClick={() => setSelected(new Set())}
					>
						<X />
					</Button>
					<span className="text-[13px] tabular-nums">
						{selected.size} selected
					</span>
					<div className="ml-auto flex items-center gap-2">
						<IssueUpdate
							contactIds={[...selected]}
							onDone={() => setSelected(new Set())}
						>
							<Button size="sm">
								<FileText />
								Issue update
							</Button>
						</IssueUpdate>
					</div>
				</div>
			) : (
				<TableFoot
					shown={filtered.length}
					total={rows.length}
					noun="contacts"
				/>
			)}

			<ConfirmDialog
				open={removing !== null}
				onOpenChange={(open) => !open && setRemoving(null)}
				title="Delete this contact?"
				description="They come off the list. Their links and everything you know about when they read what is kept, so this can be undone by hand."
				action="Delete"
				onConfirm={() => {
					if (removing) remove.mutate({ id: removing });
					setRemoving(null);
				}}
			/>

			{resolving && <DuplicatesSheet onClose={() => setResolving(false)} />}
			{contact.value && (
				<ContactDrawer id={contact.value} onClose={contact.close} />
			)}
			{sheet.value === "new" && <NewContact onClose={sheet.close} />}
			{sheet.value === "import" && <ImportContacts onClose={sheet.close} />}
		</Page>
	);
}

function NewContact({ onClose }: { onClose: () => void }) {
	const utils = trpc.useUtils();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const guard = useUnsavedGuard(Boolean(name || email), onClose);

	const create = trpc.contacts.create.useMutation({
		onSuccess: async () => {
			await utils.contacts.list.invalidate();
			toast.success("Added.");
			onClose();
		},
		onError: (err) => toast.error(err.message),
	});

	return (
		<Sheet open onOpenChange={(open) => !open && guard.requestClose()}>
			<SheetContent className="max-w-[520px]" aria-describedby={undefined}>
				<SheetHeader>
					<SheetTitle>Add somebody</SheetTitle>
				</SheetHeader>
				<SheetBody className="flex flex-col gap-4">
					<FloatingInput
						label="Name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						autoFocus
					/>
					<FloatingInput
						label="Email"
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
					/>
				</SheetBody>
				<SheetFooter>
					<Button
						disabled={create.isPending || !email.trim()}
						onClick={() => create.mutate({ name: name || null, email })}
					>
						{create.isPending ? "Adding" : "Add"}
					</Button>
				</SheetFooter>
				{guard.dialog}
			</SheetContent>
		</Sheet>
	);
}

/**
 * A paste box rather than a CSV upload. A CSV means a column-mapping screen
 * for a list that gets pasted maybe four times a year, and the parser this
 * uses already handles the three shapes people actually copy.
 */
function ImportContacts({ onClose }: { onClose: () => void }) {
	const utils = trpc.useUtils();
	const [text, setText] = useState("");
	const guard = useUnsavedGuard(Boolean(text.trim()), onClose);

	const run = trpc.contacts.importPaste.useMutation({
		onSuccess: async (result) => {
			await utils.contacts.list.invalidate();
			const parts = [`${result.created} added`];
			if (result.skipped.length)
				parts.push(`${result.skipped.length} already on the list`);
			if (result.invalid.length)
				parts.push(`${result.invalid.length} unreadable`);
			toast.success(parts.join(", "));
			if (result.invalid.length === 0) onClose();
			else setText(result.invalid.join("\n"));
		},
		onError: (err) => toast.error(err.message),
	});

	return (
		<Sheet open onOpenChange={(open) => !open && guard.requestClose()}>
			<SheetContent className="max-w-[560px]" aria-describedby={undefined}>
				<SheetHeader>
					<SheetTitle>Paste a list</SheetTitle>
				</SheetHeader>
				<SheetBody>
					<FloatingTextarea
						label="One per line: address, Name <address>, or Name, address"
						rows={14}
						value={text}
						onChange={(e) => setText(e.target.value)}
						autoFocus
					/>
				</SheetBody>
				<SheetFooter>
					<Button
						disabled={run.isPending || !text.trim()}
						onClick={() => run.mutate({ text })}
					>
						{run.isPending ? "Importing" : "Import"}
					</Button>
				</SheetFooter>
				{guard.dialog}
			</SheetContent>
		</Sheet>
	);
}
