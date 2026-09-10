import {
	Empty,
	H2,
	Mono,
	StatusText,
	Tinted,
} from "@/components/admin/primitives";
import { Timeline, TimelineItem } from "@/components/admin/timeline";
import { useUnsavedGuard } from "@/components/admin/unsaved-guard";
import { ConfirmButton } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	FloatingCombobox,
	FloatingInput,
	FloatingSelect,
	FloatingTextarea,
} from "@/components/ui/floating-field";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
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
import { Copy, Link2Off, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

const when = (value: Date | string) =>
	new Date(value).toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});

const day = (value: Date | string) =>
	new Date(value).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});

/** Today as the value a date input wants. */
const today = () => new Date().toISOString().slice(0, 10);

/** "a, b" in a field to ["a", "b"] on the wire. */
const list = (text: string) =>
	text
		.split(",")
		.map((v) => v.trim())
		.filter(Boolean);

type Draft = {
	name: string;
	email: string;
	title: string;
	phone: string;
	status: string;
	tags: string;
	pocs: string;
	notes: string;
	organizationId: string | null;
};

function draftFrom(row: {
	name: string | null;
	email: string | null;
	title: string | null;
	phone: string | null;
	status: string;
	tags: string[];
	pocs: string[];
	notes: string | null;
	organizationId: string | null;
}): Draft {
	return {
		name: row.name ?? "",
		email: row.email ?? "",
		title: row.title ?? "",
		phone: row.phone ?? "",
		status: row.status,
		tags: row.tags.join(", "),
		pocs: row.pocs.join(", "),
		notes: row.notes ?? "",
		organizationId: row.organizationId,
	};
}

/**
 * One person. Four sections top to bottom: what we know, what we did, what
 * we sent, and what happened, which is the order you read them in when
 * somebody's name comes up.
 */
export function ContactDrawer({
	id,
	onClose,
}: {
	id: string;
	onClose: () => void;
}) {
	const utils = trpc.useUtils();
	const detail = trpc.contacts.byId.useQuery({ id });
	const timeline = trpc.contacts.timeline.useQuery({ id });
	const links = trpc.links.byContact.useQuery({ contactId: id });
	const logged = trpc.interactions.byContact.useQuery({ contactId: id });
	const organizations = trpc.organizations.list.useQuery();

	// `seed` is what the record looked like when the draft was taken, so
	// dirtiness is a comparison rather than a flag somebody forgets to set.
	const [seed, setSeed] = useState<Draft | null>(null);
	const [draft, setDraft] = useState<Draft | null>(null);

	// Seeded once per record. Re-seeding on every fetch would overwrite what
	// somebody is halfway through typing when a background refetch lands.
	useEffect(() => {
		const row = detail.data?.contact;
		if (!row) return;
		const next = draftFrom(row);
		setSeed(next);
		setDraft(next);
	}, [detail.data?.contact]);

	const dirty =
		draft !== null &&
		seed !== null &&
		JSON.stringify(draft) !== JSON.stringify(seed);
	const guard = useUnsavedGuard(dirty, onClose);

	const invalidate = () =>
		Promise.all([
			utils.contacts.list.invalidate(),
			utils.contacts.byId.invalidate({ id }),
			utils.contacts.timeline.invalidate({ id }),
			utils.contacts.duplicates.invalidate(),
		]);

	const save = trpc.contacts.update.useMutation({
		onSuccess: async () => {
			await invalidate();
			toast.success("Saved.");
		},
		onError: (err) => toast.error(err.message),
	});

	const remove = trpc.contacts.remove.useMutation({
		onSuccess: async () => {
			await utils.contacts.list.invalidate();
			toast.success("Deleted.");
			onClose();
		},
		onError: (err) => toast.error(err.message),
	});

	const revoke = trpc.links.revoke.useMutation({
		onSuccess: async () => {
			await Promise.all([
				utils.links.byContact.invalidate({ contactId: id }),
				utils.contacts.timeline.invalidate({ id }),
			]);
			toast.success("Link revoked. It answers 404 now.");
		},
		onError: (err) => toast.error(err.message),
	});

	const removeLog = trpc.interactions.remove.useMutation({
		onSuccess: async () => {
			await Promise.all([
				utils.interactions.byContact.invalidate({ contactId: id }),
				utils.contacts.timeline.invalidate({ id }),
				utils.contacts.list.invalidate(),
			]);
		},
		onError: (err) => toast.error(err.message),
	});

	function submit() {
		if (!draft) return;
		save.mutate({
			id,
			name: draft.name || null,
			email: draft.email || null,
			title: draft.title || null,
			phone: draft.phone || null,
			status: normalizeStatus(draft.status),
			tags: list(draft.tags),
			pocs: list(draft.pocs),
			notes: draft.notes || null,
			organizationId: draft.organizationId,
		});
	}

	const row = detail.data?.contact;
	const org = detail.data?.organization;
	const sent = links.data ?? [];
	const history = timeline.data ?? [];
	const entries = logged.data ?? [];

	return (
		<Sheet open onOpenChange={(open) => !open && guard.requestClose()}>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>{row?.name || row?.email || "Contact"}</SheetTitle>
					<SheetDescription className="flex flex-wrap items-center gap-2">
						{row ? (
							<>
								<StatusText status={row.status} />
								{row.email && (
									<>
										<span className="text-muted-foreground/50">·</span>
										<Mono className="text-[13px]">{row.email}</Mono>
									</>
								)}
								{(row.title || org) && (
									<>
										<span className="text-muted-foreground/50">·</span>
										<span>
											{[row.title, org?.name].filter(Boolean).join(", ")}
										</span>
									</>
								)}
							</>
						) : (
							"Loading"
						)}
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
									label="Email"
									type="email"
									value={draft.email}
									onChange={(e) =>
										setDraft({ ...draft, email: e.target.value })
									}
								/>
								<FloatingInput
									label="Title"
									value={draft.title}
									onChange={(e) =>
										setDraft({ ...draft, title: e.target.value })
									}
								/>
								<FloatingCombobox
									label="Organization"
									value={draft.organizationId}
									onChange={(value) =>
										setDraft({ ...draft, organizationId: value })
									}
									clearLabel="None"
									options={(organizations.data ?? []).map((o) => ({
										value: o.id,
										label: o.name,
										hint: o.domain,
									}))}
								/>
								<FloatingInput
									label="Phone"
									value={draft.phone}
									onChange={(e) =>
										setDraft({ ...draft, phone: e.target.value })
									}
								/>
								<FloatingSelect
									label="Status"
									value={draft.status}
									onChange={(value) => setDraft({ ...draft, status: value })}
									options={CONTACT_STATUSES.map((status) => ({
										value: status,
										label: STATUS_LABEL[status],
									}))}
								/>
								<FloatingInput
									label="POCs"
									value={draft.pocs}
									onChange={(e) => setDraft({ ...draft, pocs: e.target.value })}
								/>
								<FloatingInput
									label="Tags"
									value={draft.tags}
									onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
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
						<H2 right={<LogInteraction contactId={id} />}>Interactions</H2>
						{entries.length === 0 && <Empty>Nothing logged yet.</Empty>}
						{entries.length > 0 && (
							<div className="border border-border">
								<Table>
									<TableBody>
										{entries.map((entry) => (
											<TableRow key={entry.id} className="hover:bg-transparent">
												<TableCell className="w-[120px] align-top text-[12.5px] text-muted-foreground tabular-nums">
													{day(entry.occurredAt)}
												</TableCell>
												<TableCell className="align-top">
													{entry.topic && (
														<div className="mb-0.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
															{entry.topic}
														</div>
													)}
													<div className="whitespace-pre-wrap text-[14px] leading-relaxed">
														{entry.summary}
													</div>
												</TableCell>
												<TableCell className="w-[48px] align-top text-right">
													<ConfirmButton
														title="Remove this entry?"
														description="It comes off their log. The history keeps a note that it was removed."
														action="Remove"
														onConfirm={() => removeLog.mutate({ id: entry.id })}
													>
														<Button
															variant="icon"
															size="icon-xs"
															title="Remove"
														>
															<X />
															<span className="sr-only">Remove</span>
														</Button>
													</ConfirmButton>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						)}
					</section>

					<section>
						<H2
							right={
								<AddLink
									contactId={id}
									linkedUpdateIds={sent.map((entry) => entry.updateId)}
								/>
							}
						>
							Links
						</H2>
						{sent.length === 0 && <Empty>No links yet.</Empty>}
						{sent.length > 0 && (
							<div className="border border-border">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Update</TableHead>
											<TableHead className="w-[104px]">Ref</TableHead>
											<TableHead className="w-[64px] text-right">
												Opens
											</TableHead>
											<TableHead className="w-[72px]" />
										</TableRow>
									</TableHeader>
									<TableBody>
										{sent.map((entry) => (
											<TableRow
												key={entry.id}
												className={entry.revokedAt ? "opacity-55" : ""}
											>
												<TableCell className="truncate text-[14px]">
													{entry.updateTitle}
												</TableCell>
												<TableCell>
													<Mono>{entry.ref}</Mono>
												</TableCell>
												<TableCell className="text-right text-[12px] text-muted-foreground tabular-nums">
													{entry.clicks}
												</TableCell>
												<TableCell className="text-right">
													{entry.revokedAt ? (
														<Tinted tone="neutral" className="text-[12.5px]">
															revoked
														</Tinted>
													) : (
														<div className="flex items-center justify-end gap-0.5">
															<Button
																variant="icon"
																size="icon-xs"
																title="Copy link"
																onClick={() => {
																	navigator.clipboard.writeText(
																		`${window.location.origin}/u/${entry.ref}`,
																	);
																	toast.success("Copied.");
																}}
															>
																<Copy />
																<span className="sr-only">Copy link</span>
															</Button>
															<ConfirmButton
																title="Revoke this link?"
																description="It will answer 404 from then on, exactly as a link that never existed does. Their past opens are kept."
																action="Revoke"
																onConfirm={() =>
																	revoke.mutate({ id: entry.id })
																}
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
										))}
									</TableBody>
								</Table>
							</div>
						)}
					</section>

					<section>
						<H2>History</H2>
						{history.length === 0 && <Empty>Nothing yet.</Empty>}
						<Timeline>
							{history.map((entry, index, all) => (
								<TimelineItem
									key={`${entry.kind}-${entry.at}-${index}`}
									last={index === all.length - 1}
									muted={entry.automated}
									at={when(entry.at)}
									title={
										entry.kind === "click" ? (
											<>
												Opened{" "}
												<span className="italic">{entry.updateTitle}</span>
												{entry.automated && (
													<span className="ml-1.5 text-[11px] text-muted-foreground">
														looks automated
													</span>
												)}
											</>
										) : entry.kind === "interaction" ? (
											entry.field ? (
												entry.field
											) : (
												"Logged"
											)
										) : entry.field ? (
											<>{entry.field} changed</>
										) : (
											entry.verb
										)
									}
								>
									{entry.kind === "interaction" && entry.newValue}
									{entry.kind === "edit" && entry.field && (
										<>
											{entry.oldValue || "empty"} to {entry.newValue || "empty"}
											{entry.actorName ? `, by ${entry.actorName}` : ""}
										</>
									)}
								</TimelineItem>
							))}
						</Timeline>
					</section>
				</SheetBody>

				<SheetFooter>
					<ConfirmButton
						title="Delete this contact?"
						description="They come off the list. Their links and everything you know about when they read what is kept, so this can be undone by hand."
						action="Delete"
						onConfirm={() => remove.mutate({ id })}
					>
						<Button variant="outline">
							<Trash2 />
							Delete
						</Button>
					</ConfirmButton>
					<Button onClick={submit} disabled={save.isPending || !dirty}>
						{save.isPending ? "Saving" : "Save"}
					</Button>
				</SheetFooter>

				{guard.dialog}
			</SheetContent>
		</Sheet>
	);
}

/** Add one entry to the log: what happened, under what heading, on what day. */
function LogInteraction({ contactId }: { contactId: string }) {
	const utils = trpc.useUtils();
	const [open, setOpen] = useState(false);
	const [summary, setSummary] = useState("");
	const [topic, setTopic] = useState("");
	const [date, setDate] = useState(today());

	const create = trpc.interactions.create.useMutation({
		onSuccess: async () => {
			await Promise.all([
				utils.interactions.byContact.invalidate({ contactId }),
				utils.contacts.timeline.invalidate({ id: contactId }),
				utils.contacts.list.invalidate(),
			]);
			setSummary("");
			setTopic("");
			setDate(today());
			setOpen(false);
		},
		onError: (err) => toast.error(err.message),
	});

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button variant="outline" size="xs">
					<Plus />
					Log
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-[420px] p-4">
				<div className="flex flex-col gap-3">
					<FloatingTextarea
						label="What happened"
						rows={3}
						value={summary}
						onChange={(e) => setSummary(e.target.value)}
						autoFocus
					/>
					<div className="grid grid-cols-2 gap-3">
						<FloatingInput
							label="Topic"
							value={topic}
							onChange={(e) => setTopic(e.target.value)}
						/>
						<FloatingInput
							label="When"
							type="date"
							value={date}
							onChange={(e) => setDate(e.target.value)}
						/>
					</div>
					<div className="flex justify-end">
						<Button
							size="sm"
							disabled={create.isPending || !summary.trim()}
							onClick={() =>
								create.mutate({
									contactId,
									summary,
									topic: topic || null,
									occurredAt: date ? new Date(`${date}T12:00:00`) : undefined,
								})
							}
						>
							{create.isPending ? "Logging" : "Log"}
						</Button>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}

/**
 * Mint a link for this person to one update, from the drawer. The other
 * direction (an update, many people) lives on the update's page; this is
 * for the one person who was missed.
 */
function AddLink({
	contactId,
	linkedUpdateIds,
}: {
	contactId: string;
	linkedUpdateIds: string[];
}) {
	const utils = trpc.useUtils();
	const [open, setOpen] = useState(false);
	const updates = trpc.updates.list.useQuery(undefined, { enabled: open });

	const create = trpc.links.createForContacts.useMutation({
		onSuccess: async (result, variables) => {
			await Promise.all([
				utils.links.byContact.invalidate({ contactId }),
				utils.contacts.timeline.invalidate({ id: contactId }),
				utils.updates.list.invalidate(),
				utils.updates.byId.invalidate({ id: variables.updateId }),
			]);
			toast.success(result.created ? "Link created." : "They already had one.");
			setOpen(false);
		},
		onError: (err) => toast.error(err.message),
	});

	const linked = new Set(linkedUpdateIds);
	const available = (updates.data ?? []).filter((u) => !linked.has(u.id));

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button variant="outline" size="xs">
					<Plus />
					Add
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-[320px] p-0">
				<Command loop>
					<CommandInput placeholder="Which update" className="text-[13px]" />
					<CommandList className="max-h-[260px]">
						<CommandEmpty>
							{updates.isLoading
								? "Loading"
								: available.length === 0
									? "They have a link to every update."
									: "Nothing matches."}
						</CommandEmpty>
						<CommandGroup>
							{available.map((update) => (
								<CommandItem
									key={update.id}
									value={`${update.title} ${update.slug}`}
									disabled={create.isPending}
									onSelect={() =>
										create.mutate({
											updateId: update.id,
											contactIds: [contactId],
										})
									}
								>
									<span className="truncate">{update.title}</span>
									<span className="ml-auto truncate pl-3 font-mono text-[11px] text-muted-foreground">
										{update.slug}
									</span>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
