import { ContactDrawer } from "@/components/admin/contact-drawer";
import { FilterBar } from "@/components/admin/filter-bar";
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
import { Copy, Link as LinkIcon, Trash2, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { z } from "zod";

const searchSchema = z.object({
	contact: z.string().optional(),
	sheet: z.enum(["new", "import"]).optional(),
	q: z.string().optional(),
	status: z.enum(CONTACT_STATUSES).optional(),
});

export const Route = createFileRoute("/admin/contacts")({
	validateSearch: searchSchema,
	component: Contacts,
});

type Status = (typeof CONTACT_STATUSES)[number];

function Contacts() {
	const { q, status } = Route.useSearch();
	const navigate = Route.useNavigate();
	const utils = trpc.useUtils();
	const contact = useDrawerParam("contact");
	const sheet = useDrawerParam("sheet");
	const [removing, setRemoving] = useState<string | null>(null);

	const list = trpc.contacts.list.useQuery();
	const rows = list.data ?? [];

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
			if (!needle) return true;
			return [row.name, row.email, row.organizationName, ...row.tags]
				.filter(Boolean)
				.some((field) => String(field).toLowerCase().includes(needle));
		});
	}, [rows, q, status]);

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

	function copy(text: string, what: string) {
		navigator.clipboard.writeText(text);
		toast.success(`${what} copied.`);
	}

	return (
		<Page>
			<PageHead
				title="Contacts"
				toolbar={
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
						]}
					/>
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
							<TableHead>Person</TableHead>
							<TableHead className="hidden w-[240px] md:table-cell">
								Organization
							</TableHead>
							<TableHead className="w-[170px]">Status</TableHead>
							<TableHead className="hidden w-[240px] lg:table-cell">
								Tags
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{list.isLoading && <RowsSkeleton rows={8} cols={4} />}
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
										onSelect: () => copy(row.email, "Email"),
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
									onClick={() => contact.open(row.id)}
								>
									<TableCell>
										<div className="truncate font-medium">
											{row.name || row.email}
										</div>
										{row.name && (
											<Mono className="mt-0.5 block truncate text-[12px]">
												{row.email}
											</Mono>
										)}
									</TableCell>
									<TableCell className="hidden truncate text-muted-foreground md:table-cell">
										{row.organizationName ?? "—"}
									</TableCell>
									<TableCell>
										<StatusText status={row.status} />
									</TableCell>
									<TableCell className="hidden truncate text-[12.5px] text-muted-foreground lg:table-cell">
										{row.tags.length ? row.tags.join(", ") : "—"}
									</TableCell>
								</TableRow>
							</RowMenu>
						))}
					</TableBody>
				</ListTable>

				{!list.isLoading && filtered.length === 0 && (
					<Empty>{q || status ? "Nothing matches that." : "Nobody yet."}</Empty>
				)}
			</PageScroll>

			<TableFoot shown={filtered.length} total={rows.length} noun="contacts" />

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
