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
import { RecipientsPicker } from "@/components/admin/recipients-picker";
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
import { Copy, Link2Off, Mail, UserRound } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

/**
 * `pick`, not `sheet`: every route in the branch validates the URL, and
 * the parent `/admin/updates` owns `sheet` with its own allowed values. A
 * key the parent has never heard of passes through it untouched.
 */
export const Route = createFileRoute("/admin/updates/$id")({
	validateSearch: z.object({ pick: z.enum(["people"]).optional() }),
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

/**
 * A draft in whatever mail client is set up: the update's title as the
 * subject and the person's own link as the body. Nothing is sent from here;
 * this is the one-click version of copying a link into a new message.
 */
function draftFor(email: string, title: string, ref: string) {
	const link = `${window.location.origin}/u/${ref}`;
	return `mailto:${email}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${link}\n`)}`;
}

function UpdateDetail() {
	const { id } = Route.useParams();
	const pick = useDrawerParam("pick");
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

	const title = detail.data?.update.title ?? "Update";
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

	function openDraft(email: string, ref: string) {
		window.location.href = draftFor(email, title, ref);
	}

	return (
		<Page>
			<PageHead
				title={title}
				meta={
					detail.data ? (
						<Mono className="text-[12.5px]">
							/writing/{detail.data.update.slug}
						</Mono>
					) : undefined
				}
				actions={
					<>
						<Button
							variant="outline"
							onClick={copyAll}
							disabled={recipients.length === 0}
						>
							Copy all
						</Button>
						<Button onClick={() => pick.open("people")}>Add recipients</Button>
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
							<TableHead className="w-[130px]" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{detail.isLoading && <RowsSkeleton rows={6} cols={5} />}
						{recipients.map((row) => {
							const live = !row.revokedAt;
							return (
								<RowMenu
									key={row.id}
									actions={[
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
									<TableRow className={live ? "" : "opacity-55"}>
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
										<TableCell className="text-right">
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

			{pick.value === "people" && (
				<RecipientsPicker
					updateId={id}
					updateTitle={title}
					linkedContactIds={recipients
						.filter((row) => !row.revokedAt)
						.map((row) => row.contactId)}
					onClose={pick.close}
				/>
			)}
		</Page>
	);
}
