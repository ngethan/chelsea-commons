import {
	ColumnHead,
	FillHead,
	useColumnWidths,
} from "@/components/admin/column-sizing";
import { LinkDrawer } from "@/components/admin/link-drawer";
import {
	Empty,
	ListTable,
	Mono,
	PageScroll,
	RowsSkeleton,
	TableFoot,
	Tinted,
} from "@/components/admin/primitives";
import { RowMenu } from "@/components/admin/row-menu";
import { useDrawerParam } from "@/components/admin/use-drawer-param";
import { ConfirmButton, ConfirmDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { toast } from "@/lib/toast";
import { trpc } from "@/trpc/client";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, History, Link2Off, Mail, UserRound } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

/**
 * The table, and nothing around it. Copy all, Add people and the picker they
 * open live on the parent, which owns the tab row they sit in and already has
 * the query they read.
 */
export const Route = createFileRoute("/admin/writing/$id/recipients")({
	/** `link`: the row whose drawer is open. The parent owns `sheet` and `pick`. */
	validateSearch: z.object({ link: z.string().optional() }),
	component: Recipients,
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

/**
 * A draft in whatever mail client is set up: the post's title as the subject
 * and the person's own link as the body. Nothing is sent from here; this is
 * the one-click version of copying a link into a new message.
 */
function draftFor(email: string, title: string, ref: string) {
	const link = `${window.location.origin}/u/${ref}`;
	return `mailto:${email}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${link}\n`)}`;
}

function Recipients() {
	const { id } = Route.useParams();
	const cols = useColumnWidths("recipients", {
		link: 140,
		opens: 90,
		firstOpen: 160,
	});
	const utils = trpc.useUtils();
	const detail = trpc.posts.byId.useQuery({ id });
	const drawer = useDrawerParam("link");
	const [revoking, setRevoking] = useState<string | null>(null);

	const revoke = trpc.links.revoke.useMutation({
		onSuccess: async () => {
			await utils.posts.byId.invalidate({ id });
			toast.success("Revoked.");
		},
		onError: (err) => toast.error(err.message),
	});

	const title = detail.data?.post.name ?? "";
	const rows = detail.data?.recipients ?? [];
	const opened = rows.filter((row) => row.clicks > 0).length;

	function copyLink(ref: string) {
		navigator.clipboard.writeText(`${window.location.origin}/u/${ref}`);
		toast.success("Copied.");
	}

	function openDraft(email: string, ref: string) {
		window.location.href = draftFor(email, title, ref);
	}

	return (
		<>
			<PageScroll>
				<ListTable>
					<TableHeader>
						<TableRow>
							<FillHead cols={cols}>Person</FillHead>
							<ColumnHead cols={cols} id="link">
								Link
							</ColumnHead>
							<ColumnHead cols={cols} id="opens" className="text-right">
								Opens
							</ColumnHead>
							<ColumnHead
								cols={cols}
								id="firstOpen"
								className="hidden text-right md:table-cell"
							>
								First open
							</ColumnHead>
							<TableHead className="w-[130px]" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{detail.isLoading && (
							<RowsSkeleton
								rows={6}
								cells={[
									"lines",
									"mono",
									"number",
									{ kind: "date", className: "hidden md:table-cell" },
									"none",
								]}
							/>
						)}
						{rows.map((row) => {
							const live = !row.revokedAt;
							return (
								<RowMenu
									key={row.id}
									actions={[
										{
											label: "History",
											icon: History,
											onSelect: () => drawer.open(row.id),
										},
										{
											label: "Open in Mail",
											icon: Mail,
											disabled: !live || !row.contactEmail,
											onSelect: () =>
												row.contactEmail &&
												openDraft(row.contactEmail, row.ref),
										},
										{
											label: "Copy link",
											icon: Copy,
											disabled: !live,
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
											disabled: !live,
											onSelect: () => setRevoking(row.id),
										},
									]}
								>
									<TableRow
										className={
											live ? "cursor-pointer" : "cursor-pointer opacity-55"
										}
										onClick={() => drawer.open(row.id)}
									>
										<TableCell>
											<div className="truncate">
												{row.contactName || row.contactEmail || "Unnamed"}
											</div>
											{row.contactName && row.contactEmail && (
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
										<TableCell
											className="text-right"
											onClick={(e) => e.stopPropagation()}
										>
											{live ? (
												<div className="flex items-center justify-end gap-0.5">
													{row.contactEmail && (
														<Button
															variant="icon"
															size="icon-xs"
															title="Open in Mail"
															onClick={() =>
																row.contactEmail &&
																openDraft(row.contactEmail, row.ref)
															}
														>
															<Mail />
															<span className="sr-only">Open in Mail</span>
														</Button>
													)}
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
											) : (
												<Tinted tone="neutral" className="text-[12.5px]">
													revoked
												</Tinted>
											)}
										</TableCell>
									</TableRow>
								</RowMenu>
							);
						})}
					</TableBody>
				</ListTable>

				{!detail.isLoading && rows.length === 0 && <Empty>Nobody yet.</Empty>}
			</PageScroll>

			<TableFoot shown={rows.length} total={rows.length} noun="recipients">
				<span>{opened} opened</span>
			</TableFoot>

			{drawer.value && (
				<LinkDrawer id={drawer.value} postId={id} onClose={drawer.close} />
			)}

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
		</>
	);
}
