import { Empty, H2, Mono, Tinted } from "@/components/admin/primitives";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { toast } from "@/lib/toast";
import { describeAgent } from "@/lib/user-agent";
import { trpc } from "@/trpc/client";
import { Copy, Link2Off, X } from "lucide-react";

/**
 * One tracked link, opened from a row on the recipients tab: who it was
 * issued to and by whom, whether it still answers, and every hit it has
 * taken, including the ones the heuristic does not count. Those are shown
 * dimmed rather than hidden, because the drawer is where a number's
 * evidence is meant to be looked at. A hit can be struck, which is how a
 * test open of one's own link comes off the count.
 */
export function LinkDrawer({
	id,
	postId,
	onClose,
}: {
	id: string;
	postId: string;
	onClose: () => void;
}) {
	const utils = trpc.useUtils();
	const history = trpc.links.history.useQuery({ id });
	const row = history.data;

	async function refresh() {
		await Promise.all([
			utils.links.history.invalidate({ id }),
			utils.posts.byId.invalidate({ id: postId }),
			row ? utils.contacts.timeline.invalidate({ id: row.contactId }) : null,
		]);
	}

	const removeOpen = trpc.links.removeOpen.useMutation({
		onSuccess: async () => {
			await refresh();
			toast.success("Removed.");
		},
		onError: (err) => toast.error(err.message),
	});

	const revoke = trpc.links.revoke.useMutation({
		onSuccess: async () => {
			await refresh();
			toast.success("Revoked.");
		},
		onError: (err) => toast.error(err.message),
	});

	function copyLink(ref: string) {
		navigator.clipboard.writeText(`${window.location.origin}/u/${ref}`);
		toast.success("Copied.");
	}

	const live = row ? !row.revokedAt : false;
	const counted = row?.opens.filter((open) => !open.automated).length ?? 0;

	return (
		<Sheet open onOpenChange={(open) => !open && onClose()}>
			<SheetContent className="max-w-[520px]">
				<SheetHeader>
					<SheetTitle className="truncate">
						{row ? row.contactName || row.contactEmail || "Unnamed" : ""}
					</SheetTitle>
					<SheetDescription className="flex items-center gap-2">
						{row && (
							<>
								<Mono className="text-[13px]">{row.ref}</Mono>
								<span className="text-muted-foreground/50">·</span>
								{live ? (
									<Tinted tone="success">Live</Tinted>
								) : (
									<Tinted tone="neutral">Revoked</Tinted>
								)}
							</>
						)}
					</SheetDescription>
				</SheetHeader>

				<SheetBody className="flex flex-col gap-10">
					<section>
						<H2>Details</H2>
						{history.isLoading && <Lines rows={3} />}
						{row && (
							<div className="border border-border">
								<Table className="table-fixed">
									<TableBody>
										<TableRow className="hover:bg-transparent">
											<TableCell className="w-[120px] pl-4 text-muted-foreground">
												Post
											</TableCell>
											<TableCell className="truncate">{row.postName}</TableCell>
										</TableRow>
										<TableRow className="hover:bg-transparent">
											<TableCell className="pl-4 text-muted-foreground">
												Issued
											</TableCell>
											<TableCell className="tabular-nums">
												{when(row.createdAt)}
												{row.issuedBy && (
													<span className="text-muted-foreground">
														, by {row.issuedBy}
													</span>
												)}
											</TableCell>
										</TableRow>
										{row.revokedAt && (
											<TableRow className="hover:bg-transparent">
												<TableCell className="pl-4 text-muted-foreground">
													Revoked
												</TableCell>
												<TableCell className="tabular-nums">
													{when(row.revokedAt)}
												</TableCell>
											</TableRow>
										)}
										<TableRow className="hover:bg-transparent">
											<TableCell className="pl-4 text-muted-foreground">
												Opens
											</TableCell>
											<TableCell className="tabular-nums">{counted}</TableCell>
										</TableRow>
									</TableBody>
								</Table>
							</div>
						)}
					</section>

					<section>
						<H2>Opens</H2>
						{history.isLoading && <Lines />}
						{row && row.opens.length === 0 && <Empty>None yet.</Empty>}
						{row && row.opens.length > 0 && (
							<div className="border border-border">
								<Table className="table-fixed">
									<TableBody>
										{row.opens.map((open) => {
											const device = describeAgent(open.userAgent);
											return (
												<TableRow
													key={open.id}
													className={
														open.automated
															? "opacity-55 hover:bg-transparent"
															: "hover:bg-transparent"
													}
												>
													<TableCell className="w-[170px] whitespace-nowrap pl-4 text-muted-foreground tabular-nums">
														{when(open.at)}
													</TableCell>
													<TableCell
														className="truncate"
														title={open.userAgent ?? undefined}
													>
														{open.automated ? "Looks automated" : "Opened"}
														{device && (
															<span className="text-muted-foreground">
																{", "}
																{device}
															</span>
														)}
													</TableCell>
													<TableCell className="w-[48px] pr-2 text-right">
														<ConfirmButton
															title="Remove this open?"
															description="It comes off the count. The contact's history keeps a note that it was removed."
															action="Remove"
															onConfirm={() =>
																removeOpen.mutate({ id: open.id })
															}
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
											);
										})}
									</TableBody>
								</Table>
							</div>
						)}
					</section>
				</SheetBody>

				<SheetFooter>
					{row && live && (
						<ConfirmButton
							title="Revoke this link?"
							description="It answers 404 from then on, the same as a link that never existed. Their past opens are kept."
							action="Revoke"
							onConfirm={() => revoke.mutate({ id })}
						>
							<Button
								type="button"
								variant="outline"
								disabled={revoke.isPending}
							>
								<Link2Off />
								Revoke
							</Button>
						</ConfirmButton>
					)}
					{row && live && (
						<Button type="button" onClick={() => copyLink(row.ref)}>
							<Copy />
							Copy link
						</Button>
					)}
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}

const when = (value: Date | string) =>
	new Date(value).toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});

function Lines({ rows = 2 }: { rows?: number }) {
	return (
		<div className="flex flex-col gap-3 border border-border px-4 py-4">
			{Array.from({ length: rows }, (_, i) => (
				<Skeleton
					key={i}
					className="h-3.5"
					style={{ width: `${45 + ((i * 23) % 40)}%` }}
				/>
			))}
		</div>
	);
}
