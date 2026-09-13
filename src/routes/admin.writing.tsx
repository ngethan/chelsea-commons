import {
	ColumnHead,
	FillHead,
	useColumnWidths,
} from "@/components/admin/column-sizing";
import {
	Empty,
	FilterTabs,
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
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { POST_KIND_LABEL } from "@/lib/post-state";
import { toast } from "@/lib/toast";
import { trpc } from "@/trpc/client";
import {
	Outlet,
	createFileRoute,
	useMatches,
	useNavigate,
} from "@tanstack/react-router";
import {
	ExternalLink,
	Eye,
	EyeOff,
	FileText,
	Link as LinkIcon,
	Trash2,
	Upload,
	X,
} from "lucide-react";
import { useState } from "react";
import { z } from "zod";

/**
 * One screen for everything written, filtered rather than split in two.
 *
 * A letter and a blog post are the same row with `kind` set differently, and
 * `kind` flips: a letter sent to twelve people in March is a post on the blog
 * in May if that is what you decide. Two pages partitioned by kind would have
 * to move a row between them, or show it twice.
 */
const FILTERS = ["all", "posts", "letters", "drafts"] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_LABEL: Record<Filter, string> = {
	all: "All",
	posts: "Posts",
	letters: "Letters",
	drafts: "Drafts",
};

export const Route = createFileRoute("/admin/writing")({
	validateSearch: z.object({ show: z.enum(FILTERS).optional() }),
	component: Writing,
});

function Writing() {
	// The editor is a page, not a drawer: it is a document, and 720px of sheet
	// is not where one gets written.
	const isDetail = useMatches().some((match) =>
		match.routeId.startsWith("/admin/writing/$"),
	);
	if (isDetail) return <Outlet />;

	return <WritingList />;
}

const day = (value: Date | string | null) =>
	value
		? new Date(value).toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
			})
		: "—";

function WritingList() {
	const navigate = useNavigate();
	const utils = trpc.useUtils();
	const { show = "all" } = Route.useSearch();
	const cols = useColumnWidths("writing", {
		slug: 240,
		status: 110,
		updated: 130,
		recipients: 100,
		opened: 100,
	});
	const list = trpc.posts.list.useQuery();
	const [removing, setRemoving] = useState<string | null>(null);
	const [removingMany, setRemovingMany] = useState(false);

	// Rows ticked for a bulk action. Ids, not rows, so a selection survives a
	// refetch; it is cleared once the action has run.
	const [selected, setSelected] = useState<Set<string>>(new Set());
	function toggleSelected(id: string) {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	const all = list.data ?? [];
	const rows = all.filter((row) => {
		if (show === "posts") return row.kind === "post";
		if (show === "letters") return row.kind === "letter";
		if (show === "drafts") return row.status === "draft";
		return true;
	});

	const counts: Record<Filter, number> = {
		all: all.length,
		posts: all.filter((r) => r.kind === "post").length,
		letters: all.filter((r) => r.kind === "letter").length,
		drafts: all.filter((r) => r.status === "draft").length,
	};

	const create = trpc.posts.create.useMutation({
		onSuccess: async (row) => {
			await utils.posts.list.invalidate();
			navigate({ to: "/admin/writing/$id", params: { id: row.id } });
		},
		onError: (err) => toast.error(err.message),
	});

	const remove = trpc.posts.remove.useMutation({
		onSuccess: async () => {
			await utils.posts.list.invalidate();
			toast.success("Deleted.");
		},
		onError: (err) => toast.error(err.message),
	});

	/** Each of these refetches, says what actually happened, and clears. */
	const done = async (message: string) => {
		await utils.posts.list.invalidate();
		toast.success(message);
		setSelected(new Set());
	};
	const failed = (err: { message: string }) => toast.error(err.message);

	const publishMany = trpc.posts.publishMany.useMutation({
		onSuccess: (r) =>
			done(
				`${r.published} published${r.skipped ? `, ${r.skipped} already were` : ""}.`,
			),
		onError: failed,
	});

	const unpublishMany = trpc.posts.unpublishMany.useMutation({
		onSuccess: (r) => done(`${r.unpublished} back to drafts.`),
		onError: failed,
	});

	const setVisibilityMany = trpc.posts.setVisibilityMany.useMutation({
		onSuccess: (r) =>
			done(
				`${r.changed} changed${r.skipped ? `, ${r.skipped} left alone` : ""}.`,
			),
		onError: failed,
	});

	// Says which ones it kept, not just how many. "3 of 5 deleted" without
	// naming the other two is a worse answer than not running at all.
	const removeMany = trpc.posts.removeMany.useMutation({
		onSuccess: (r) =>
			done(
				r.kept.length === 0
					? `${r.deleted} deleted.`
					: `${r.deleted} deleted. Kept ${r.kept.slice(0, 3).join(", ")}${r.kept.length > 3 ? ` and ${r.kept.length - 3} more` : ""}: already sent.`,
			),
		onError: failed,
	});

	const ids = [...selected];
	const busy =
		publishMany.isPending ||
		unpublishMany.isPending ||
		setVisibilityMany.isPending ||
		removeMany.isPending;

	function copy(text: string, what: string) {
		navigator.clipboard.writeText(text);
		toast.success(`${what} copied.`);
	}

	const open = (id: string) =>
		navigate({ to: "/admin/writing/$id", params: { id } });

	return (
		<Page>
			<PageHead
				title="Writing"
				actions={
					<Button onClick={() => create.mutate({})} disabled={create.isPending}>
						New
					</Button>
				}
				toolbar={
					<FilterTabs
						value={show}
						onChange={(next) =>
							navigate({
								to: "/admin/writing",
								search: next === "all" ? {} : { show: next },
							})
						}
						options={FILTERS.map((value) => ({
							value,
							label: FILTER_LABEL[value],
							count: counts[value],
						}))}
					/>
				}
			/>

			<PageScroll>
				<ListTable>
					<TableHeader>
						<TableRow>
							<TableHead data-tick>
								<Checkbox
									aria-label="Select everything shown"
									checked={
										rows.length > 0 && rows.every((row) => selected.has(row.id))
									}
									onCheckedChange={(checked) =>
										setSelected((prev) => {
											const next = new Set(prev);
											for (const row of rows) {
												if (checked) next.add(row.id);
												else next.delete(row.id);
											}
											return next;
										})
									}
								/>
							</TableHead>
							<FillHead cols={cols}>Title</FillHead>
							<ColumnHead
								cols={cols}
								id="slug"
								className="hidden md:table-cell"
							>
								Slug
							</ColumnHead>
							<ColumnHead cols={cols} id="status">
								Status
							</ColumnHead>
							<ColumnHead
								cols={cols}
								id="updated"
								className="hidden lg:table-cell"
							>
								Updated
							</ColumnHead>
							<ColumnHead cols={cols} id="recipients" className="text-right">
								Sent to
							</ColumnHead>
							<ColumnHead cols={cols} id="opened" className="text-right">
								Opened
							</ColumnHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{list.isLoading && (
							<RowsSkeleton
								rows={5}
								cells={[
									"tick",
									"text",
									{ kind: "mono", className: "hidden md:table-cell" },
									"text",
									{ kind: "date", className: "hidden lg:table-cell" },
									"number",
									"number",
								]}
							/>
						)}
						{rows.map((row) => (
							<RowMenu
								key={row.id}
								actions={[
									{
										label: "Open",
										icon: FileText,
										onSelect: () => open(row.id),
									},
									{
										label: "Copy public link",
										icon: ExternalLink,
										disabled: row.status !== "published",
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
												`${window.location.origin}/admin/writing/${row.id}`,
												"Link",
											),
									},
									"separator",
									{
										label: "Delete",
										icon: Trash2,
										disabled: row.recipients > 0,
										onSelect: () => setRemoving(row.id),
									},
								]}
							>
								<TableRow
									className="cursor-pointer"
									data-state={selected.has(row.id) ? "selected" : undefined}
									onClick={() => open(row.id)}
								>
									{/* The tick is its own target: a click here selects and
									    does not open. */}
									<TableCell
										data-tick
										onClick={(e) => {
											e.stopPropagation();
											toggleSelected(row.id);
										}}
									>
										<Checkbox
											checked={selected.has(row.id)}
											onCheckedChange={() => toggleSelected(row.id)}
											onClick={(e) => e.stopPropagation()}
											aria-label={`Select ${row.name}`}
										/>
									</TableCell>
									<TableCell className="truncate font-medium">
										{row.name}
									</TableCell>
									<TableCell className="hidden md:table-cell">
										<Mono className="truncate text-[12.5px]">{row.slug}</Mono>
									</TableCell>
									<TableCell>
										{/* Four states in two words. A letter is always private,
										    so saying so beside it would be noise. */}
										{row.status === "draft" ? (
											<Tinted tone="neutral">Draft</Tinted>
										) : row.kind === "letter" ? (
											<Tinted tone="primary">
												{POST_KIND_LABEL[row.kind]}
											</Tinted>
										) : row.visibility === "private" ? (
											<Tinted tone="neutral">Unlisted</Tinted>
										) : (
											<Tinted tone="success">Public</Tinted>
										)}
									</TableCell>
									<TableCell className="hidden text-muted-foreground tabular-nums lg:table-cell">
										{day(row.updatedAt)}
									</TableCell>
									<TableCell className="text-right text-muted-foreground tabular-nums">
										{row.recipients || "—"}
									</TableCell>
									<TableCell className="text-right tabular-nums">
										{row.recipients ? row.opened : "—"}
									</TableCell>
								</TableRow>
							</RowMenu>
						))}
					</TableBody>
				</ListTable>

				{!list.isLoading && rows.length === 0 && <Empty>Nothing yet.</Empty>}
			</PageScroll>

			{selected.size > 0 ? (
				<div className="flex h-12 shrink-0 items-center gap-3 border-t border-border bg-panel px-4 md:px-8">
					<div className="-ml-1.5 flex items-center gap-1.5">
						<Button
							variant="icon"
							size="icon-2xs"
							aria-label="Clear selection"
							onClick={() => setSelected(new Set())}
						>
							<X />
						</Button>
						<span className="text-[13px] leading-none tabular-nums">
							{selected.size} selected
						</span>
					</div>
					<div className="ml-auto flex items-center gap-2">
						<Button
							size="sm"
							variant="outline"
							disabled={busy}
							onClick={() =>
								setVisibilityMany.mutate({ ids, visibility: "public" })
							}
						>
							<Eye />
							List
						</Button>
						<Button
							size="sm"
							variant="outline"
							disabled={busy}
							onClick={() =>
								setVisibilityMany.mutate({ ids, visibility: "private" })
							}
						>
							<EyeOff />
							Unlist
						</Button>
						<Button
							size="sm"
							variant="outline"
							disabled={busy}
							onClick={() => unpublishMany.mutate({ ids })}
						>
							Unpublish
						</Button>
						<Button
							size="sm"
							variant="outline"
							disabled={busy}
							onClick={() => setRemovingMany(true)}
						>
							<Trash2 />
							Delete
						</Button>
						<Button
							size="sm"
							disabled={busy}
							onClick={() => publishMany.mutate({ ids })}
						>
							<Upload />
							Publish
						</Button>
					</div>
				</div>
			) : (
				<TableFoot shown={rows.length} total={all.length} noun="posts" />
			)}

			<ConfirmDialog
				open={removingMany}
				onOpenChange={setRemovingMany}
				title={`Delete ${selected.size} ${selected.size === 1 ? "post" : "posts"}?`}
				description="Their revisions go with them. Anything somebody has been sent is kept, and the toast says which."
				action="Delete"
				onConfirm={() => {
					removeMany.mutate({ ids });
					setRemovingMany(false);
				}}
			/>

			<ConfirmDialog
				open={removing !== null}
				onOpenChange={(open) => !open && setRemoving(null)}
				title="Delete this post?"
				description="Its revisions go with it. Only possible while nobody has a link to it."
				action="Delete"
				onConfirm={() => {
					if (removing) remove.mutate({ id: removing });
					setRemoving(null);
				}}
			/>
		</Page>
	);
}
