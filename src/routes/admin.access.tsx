import { PersonAvatar } from "@/components/admin/person-avatar";
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
import { useUnsavedGuard } from "@/components/admin/unsaved-guard";
import { useDrawerParam } from "@/components/admin/use-drawer-param";
import { ConfirmButton } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floating-field";
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
import { toast } from "@/lib/toast";
import { trpc } from "@/trpc/client";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

export const Route = createFileRoute("/admin/access")({
	validateSearch: z.object({ sheet: z.enum(["invite"]).optional() }),
	component: Access,
});

function Access() {
	const sheet = useDrawerParam("sheet");
	const utils = trpc.useUtils();
	const list = trpc.access.list.useQuery();
	const rows = list.data ?? [];
	const live = rows.filter((row) => !row.revokedAt);

	const revoke = trpc.access.revoke.useMutation({
		onSuccess: async () => {
			await utils.access.list.invalidate();
			toast.success("Revoked, and their session is gone.");
		},
		onError: (err) => toast.error(err.message),
	});

	const restore = trpc.access.restore.useMutation({
		onSuccess: async () => {
			await utils.access.list.invalidate();
			toast.success("Restored.");
		},
		onError: (err) => toast.error(err.message),
	});

	return (
		<Page>
			<PageHead
				title="Access"
				actions={<Button onClick={() => sheet.open("invite")}>Add</Button>}
			/>

			<PageScroll>
				<ListTable>
					<TableHeader>
						<TableRow>
							<TableHead>Person</TableHead>
							<TableHead className="w-[160px]">State</TableHead>
							<TableHead className="hidden w-[140px] text-right md:table-cell">
								Added
							</TableHead>
							<TableHead className="w-[120px]" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{list.isLoading && <RowsSkeleton rows={3} cols={4} />}
						{rows.map((row) => (
							<TableRow
								key={row.id}
								className={row.revokedAt ? "opacity-55" : ""}
							>
								<TableCell>
									<div className="flex items-center gap-2">
										<PersonAvatar
											person={{ ...row, id: row.userId ?? row.id }}
										/>
										<div className="min-w-0">
											<div className="truncate font-medium">
												{row.name ?? row.email}
												{row.isYou && (
													<span className="ml-1.5 font-normal text-[12px] text-muted-foreground">
														you
													</span>
												)}
											</div>
											{row.name && (
												<Mono className="mt-0.5 block truncate text-[12px]">
													{row.email}
												</Mono>
											)}
										</div>
									</div>
								</TableCell>
								<TableCell>
									<Tinted
										tone={
											row.revokedAt
												? "neutral"
												: row.userId
													? "success"
													: "neutral"
										}
									>
										{row.revokedAt
											? "Revoked"
											: row.userId
												? "Active"
												: "Not signed in"}
									</Tinted>
								</TableCell>
								<TableCell className="hidden text-right text-muted-foreground tabular-nums md:table-cell">
									{new Date(row.createdAt).toLocaleDateString("en-US", {
										month: "short",
										day: "numeric",
									})}
								</TableCell>
								<TableCell className="text-right">
									{row.revokedAt ? (
										<Button
											variant="ghost"
											size="xs"
											onClick={() => restore.mutate({ id: row.id })}
										>
											Restore
										</Button>
									) : row.isYou ? (
										<span className="text-[12px] text-muted-foreground">—</span>
									) : (
										<ConfirmButton
											title="Revoke access?"
											description="They stop being able to sign in, and any session they are holding right now ends immediately."
											action="Revoke"
											onConfirm={() => revoke.mutate({ id: row.id })}
										>
											<Button variant="ghost" size="xs">
												Revoke
											</Button>
										</ConfirmButton>
									)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</ListTable>

				{!list.isLoading && rows.length === 0 && <Empty>Nobody yet.</Empty>}
			</PageScroll>

			<TableFoot shown={rows.length} total={rows.length} noun="people">
				<span>{live.length} active</span>
			</TableFoot>

			{sheet.value === "invite" && <InviteSomebody onClose={sheet.close} />}
		</Page>
	);
}

function InviteSomebody({ onClose }: { onClose: () => void }) {
	const utils = trpc.useUtils();
	const [email, setEmail] = useState("");
	const guard = useUnsavedGuard(Boolean(email), onClose);

	const invite = trpc.access.invite.useMutation({
		onSuccess: async () => {
			await utils.access.list.invalidate();
			toast.success("Added. They can sign in with Google now.");
			onClose();
		},
		onError: (err) => toast.error(err.message),
	});

	return (
		<Sheet open onOpenChange={(open) => !open && guard.requestClose()}>
			<SheetContent className="max-w-[520px]" aria-describedby={undefined}>
				<SheetHeader>
					<SheetTitle>Let somebody in</SheetTitle>
				</SheetHeader>
				<form
					className="flex min-h-0 flex-1 flex-col"
					onSubmit={(e) => {
						e.preventDefault();
						if (email.trim() && !invite.isPending) invite.mutate({ email });
					}}
				>
					<SheetBody>
						<FloatingInput
							label="Google address"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							autoFocus
						/>
					</SheetBody>
					<SheetFooter>
						<Button type="submit" disabled={invite.isPending || !email.trim()}>
							{invite.isPending ? "Adding" : "Add"}
						</Button>
					</SheetFooter>
				</form>
				{guard.dialog}
			</SheetContent>
		</Sheet>
	);
}
