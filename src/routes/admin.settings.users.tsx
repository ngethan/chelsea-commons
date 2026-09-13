import {
	ColumnHead,
	FillHead,
	useColumnWidths,
} from "@/components/admin/column-sizing";
import { PersonAvatar } from "@/components/admin/person-avatar";
import {
	Empty,
	ListTable,
	Mono,
	Page,
	PageScroll,
	RowsSkeleton,
	TableFoot,
	Tinted,
} from "@/components/admin/primitives";
import { RowMenu } from "@/components/admin/row-menu";
import { SettingsHead } from "@/components/admin/settings-head";
import { sortRows, useSort } from "@/components/admin/sorting";
import { useUnsavedGuard } from "@/components/admin/unsaved-guard";
import { useDrawerParam } from "@/components/admin/use-drawer-param";
import { ConfirmButton } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { FloatingInput, FloatingSelect } from "@/components/ui/floating-field";
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
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	DEFAULT_ROLE,
	ROLE_LABEL,
	type Role,
	assignableRoles,
	canEditPeople,
	canManageUsers,
} from "@/lib/roles";
import { toast } from "@/lib/toast";
import type { AppRouter } from "@/server/trpc/root";
import { buildCanonicalUrl } from "@/site-config";
import { trpc } from "@/trpc/client";
import {
	createFileRoute,
	redirect,
	useRouteContext,
} from "@tanstack/react-router";
import type { inferRouterOutputs } from "@trpc/server";
import { Link, UserRoundCheck, UserRoundX } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

/**
 * Where somebody on the roster goes to make an account. There is no mail
 * transport here, so the person inviting them sends this themselves.
 */
const joinLink = () => `${buildCanonicalUrl("/sign-in")}?mode=create`;

async function copyJoinLink() {
	try {
		await navigator.clipboard.writeText(joinLink());
		toast.success("Link copied.");
	} catch {
		toast.error(`Could not copy. The link is ${joinLink()}`);
	}
}

/** The roles the signed-in person may hand out, as select rows. */
function useRoleOptions() {
	const { user } = useRouteContext({ from: "/admin" });
	const mine = user?.role ?? null;
	return {
		mine,
		editor: canEditPeople(mine),
		options: assignableRoles(mine).map((role) => ({
			value: role,
			label: ROLE_LABEL[role],
		})),
	};
}

const day = (value: Date | string) =>
	new Date(value).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});

export const Route = createFileRoute("/admin/settings/users")({
	validateSearch: z.object({
		sheet: z.enum(["invite"]).optional(),
		user: z.string().optional(),
		/** `<column>:<asc|desc>`; see `sorting.ts`. */
		sort: z.string().optional(),
	}),
	// The server refuses a member's changes either way; this keeps them from
	// landing on a page whose every control would say so.
	beforeLoad: ({ context }) => {
		if (!canManageUsers(context.user?.role)) {
			throw redirect({ to: "/admin/contacts" });
		}
	},
	component: UsersPage,
});

type Row = inferRouterOutputs<AppRouter>["access"]["list"][number];

/** Active, invited but never signed in, or revoked. */
function State({ row }: { row: Row }) {
	if (row.revokedAt) return <Tinted tone="neutral">Revoked</Tinted>;
	if (row.userId) return <Tinted tone="success">Active</Tinted>;
	return <Tinted tone="neutral">Invited</Tinted>;
}

function UsersPage() {
	const sheet = useDrawerParam("sheet");
	const person = useDrawerParam("user");
	const list = trpc.access.list.useQuery();
	const rows = list.data ?? [];
	const sorting = useSort();
	const sorted = sortRows(rows, sorting.sort, {
		added: (row) => row.createdAt,
	});
	const live = rows.filter((row) => !row.revokedAt);
	const admins = live.filter(
		(row) => row.role === "admin" || row.role === "owner",
	);
	const actions = useRosterActions();
	const { editor } = useRoleOptions();
	const cols = useColumnWidths("users", { role: 140, state: 140, added: 140 });

	return (
		<Page>
			<SettingsHead
				actions={<Button onClick={() => sheet.open("invite")}>Invite</Button>}
			/>

			<PageScroll>
				<ListTable>
					<TableHeader>
						<TableRow>
							<FillHead cols={cols}>Person</FillHead>
							<ColumnHead cols={cols} id="role">
								Role
							</ColumnHead>
							<ColumnHead cols={cols} id="state">
								State
							</ColumnHead>
							<ColumnHead
								cols={cols}
								id="added"
								last
								sort={sorting.on("added")}
								className="hidden text-right md:table-cell"
							>
								Added
							</ColumnHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{list.isLoading && (
							<RowsSkeleton
								rows={3}
								cells={[
									"person",
									"text",
									"text",
									{ kind: "date", className: "hidden md:table-cell" },
								]}
							/>
						)}
						{sorted.map((row) => (
							<RowMenu
								key={row.id}
								actions={[
									{
										label: "Copy join link",
										icon: Link,
										onSelect: copyJoinLink,
										disabled: Boolean(row.userId) || Boolean(row.revokedAt),
									},
									"separator",
									row.revokedAt
										? {
												label: "Restore",
												icon: UserRoundCheck,
												disabled: !editor,
												onSelect: () => actions.restore.mutate({ id: row.id }),
											}
										: {
												label: "Revoke",
												icon: UserRoundX,
												disabled: !editor || row.isYou,
												onSelect: () => actions.revoke.mutate({ id: row.id }),
											},
								]}
							>
								<TableRow
									className={
										row.revokedAt
											? "cursor-pointer opacity-55"
											: "cursor-pointer"
									}
									onClick={() => person.open(row.id)}
								>
									<TableCell>
										<div className="flex items-center gap-2.5">
											<PersonAvatar
												person={{ ...row, id: row.userId ?? row.id }}
												size="md"
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
									<TableCell>{ROLE_LABEL[row.role]}</TableCell>
									<TableCell>
										<State row={row} />
									</TableCell>
									<TableCell className="hidden text-right text-muted-foreground tabular-nums md:table-cell">
										{new Date(row.createdAt).toLocaleDateString("en-US", {
											month: "short",
											day: "numeric",
										})}
									</TableCell>
								</TableRow>
							</RowMenu>
						))}
					</TableBody>
				</ListTable>

				{!list.isLoading && rows.length === 0 && <Empty>Nobody yet.</Empty>}
			</PageScroll>

			<TableFoot shown={rows.length} total={rows.length} noun="people">
				<span>{live.length} active</span>
				<span>
					{admins.length} {admins.length === 1 ? "admin" : "admins"}
				</span>
			</TableFoot>

			{sheet.value === "invite" && <InviteSomebody onClose={sheet.close} />}
			{person.value && (
				<PersonSheet
					id={person.value}
					row={rows.find((row) => row.id === person.value)}
					onClose={person.close}
				/>
			)}
		</Page>
	);
}

/** Revoke and restore, shared by the row menu and the drawer. */
function useRosterActions() {
	const utils = trpc.useUtils();

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

	return { revoke, restore };
}

/**
 * One person on the roster: what they can do, and whether they still can.
 * The role is the only thing typed here; the rest is read, and the footer
 * carries the two things that change their standing. An admin opens it and
 * reads; only an owner's copy has anything to press.
 */
function PersonSheet({
	id,
	row,
	onClose,
}: {
	id: string;
	row: Row | undefined;
	onClose: () => void;
}) {
	const utils = trpc.useUtils();
	const actions = useRosterActions();
	const { editor, options } = useRoleOptions();
	const seed = row?.role ?? DEFAULT_ROLE;
	const [role, setRole] = useState<Role>(seed);
	const dirty = role !== seed;
	const guard = useUnsavedGuard(dirty, onClose);

	const save = trpc.access.setRole.useMutation({
		onSuccess: async (saved) => {
			await utils.access.list.invalidate();
			toast.success(`Now ${ROLE_LABEL[saved.role].toLowerCase()}.`);
			onClose();
		},
		onError: (err) => toast.error(err.message),
	});

	// The list has the row or it does not; there is nothing to fetch.
	const locked = !editor || !row || row.isYou || Boolean(row.revokedAt);
	// The select needs the current role among its rows even when the reader
	// could not hand it out, or it would show blank.
	const roleOptions = options.some((o) => o.value === seed)
		? options
		: [{ value: seed, label: ROLE_LABEL[seed] }, ...options];

	return (
		<Sheet open onOpenChange={(open) => !open && guard.requestClose()}>
			<SheetContent className="max-w-[520px]">
				<form
					className="flex min-h-0 flex-1 flex-col"
					onSubmit={(e) => {
						e.preventDefault();
						if (dirty && !save.isPending) save.mutate({ id, role });
					}}
				>
					<SheetHeader className="flex-row items-center gap-4">
						{row && (
							<PersonAvatar
								person={{ ...row, id: row.userId ?? row.id }}
								size="xl"
							/>
						)}
						<div className="flex min-w-0 flex-col gap-1.5">
							<SheetTitle className="truncate">
								{row?.name ?? row?.email ?? ""}
							</SheetTitle>
							<SheetDescription className="flex items-center gap-2">
								{row && <State row={row} />}
								{row?.name && (
									<>
										<span className="text-muted-foreground/50">·</span>
										<Mono className="text-[13px]">{row.email}</Mono>
									</>
								)}
							</SheetDescription>
						</div>
					</SheetHeader>
					<SheetBody className="flex flex-col gap-8">
						<FloatingSelect
							label="Role"
							value={role}
							onChange={(value) => setRole(value as Role)}
							options={roleOptions}
							disabled={locked}
						/>
						{row && (
							<div className="border border-border">
								<Table>
									<TableBody>
										<TableRow className="hover:bg-transparent">
											<TableCell className="w-[140px] pl-4 text-muted-foreground">
												State
											</TableCell>
											<TableCell>
												<State row={row} />
											</TableCell>
										</TableRow>
										<TableRow className="hover:bg-transparent">
											<TableCell className="pl-4 text-muted-foreground">
												Added
											</TableCell>
											<TableCell className="tabular-nums">
												{day(row.createdAt)}
											</TableCell>
										</TableRow>
										<TableRow className="hover:bg-transparent">
											<TableCell className="pl-4 text-muted-foreground">
												Signed in
											</TableCell>
											<TableCell className="tabular-nums">
												{row.signedInAt ? day(row.signedInAt) : "Never"}
											</TableCell>
										</TableRow>
										{row.revokedAt && (
											<TableRow className="hover:bg-transparent">
												<TableCell className="pl-4 text-muted-foreground">
													Revoked
												</TableCell>
												<TableCell className="tabular-nums">
													{day(row.revokedAt)}
												</TableCell>
											</TableRow>
										)}
									</TableBody>
								</Table>
							</div>
						)}
					</SheetBody>
					<SheetFooter>
						{row && !row.userId && !row.revokedAt && (
							<Button
								type="button"
								variant="text"
								onClick={copyJoinLink}
								className="mr-auto"
							>
								<Link />
								Copy join link
							</Button>
						)}
						{!editor ? null : row?.revokedAt ? (
							<Button
								type="button"
								variant="outline"
								disabled={actions.restore.isPending}
								onClick={() =>
									actions.restore.mutate({ id: row.id }, { onSuccess: onClose })
								}
							>
								<UserRoundCheck />
								Restore
							</Button>
						) : row && !row.isYou ? (
							<ConfirmButton
								title="Revoke access?"
								description="They stop being able to sign in, and any session they are holding right now ends immediately."
								action="Revoke"
								onConfirm={() =>
									actions.revoke.mutate({ id: row.id }, { onSuccess: onClose })
								}
							>
								<Button
									type="button"
									variant="outline"
									disabled={actions.revoke.isPending}
								>
									<UserRoundX />
									Revoke
								</Button>
							</ConfirmButton>
						) : null}
						{editor && (
							<Button type="submit" disabled={!dirty || save.isPending}>
								{save.isPending ? "Saving" : "Save"}
							</Button>
						)}
					</SheetFooter>
				</form>
				{guard.dialog}
			</SheetContent>
		</Sheet>
	);
}

function InviteSomebody({ onClose }: { onClose: () => void }) {
	const utils = trpc.useUtils();
	const [email, setEmail] = useState("");
	const [role, setRole] = useState<Role>(DEFAULT_ROLE);
	const { options } = useRoleOptions();
	const guard = useUnsavedGuard(Boolean(email), onClose);

	const invite = trpc.access.invite.useMutation({
		onSuccess: async () => {
			await utils.access.list.invalidate();
			toast.success(
				"Invited. They can sign in with Google or make an account.",
				{
					action: { label: "Copy link", onClick: copyJoinLink },
				},
			);
			onClose();
		},
		onError: (err) => toast.error(err.message),
	});

	return (
		<Sheet open onOpenChange={(open) => !open && guard.requestClose()}>
			<SheetContent className="max-w-[520px]" aria-describedby={undefined}>
				<SheetHeader>
					<SheetTitle>Invite somebody</SheetTitle>
				</SheetHeader>
				<form
					className="flex min-h-0 flex-1 flex-col"
					onSubmit={(e) => {
						e.preventDefault();
						if (email.trim() && !invite.isPending)
							invite.mutate({ email, role });
					}}
				>
					<SheetBody className="flex flex-col gap-4">
						<FloatingInput
							label="Email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							autoFocus
						/>
						<FloatingSelect
							label="Role"
							value={role}
							onChange={(value) => setRole(value as Role)}
							options={options}
						/>
					</SheetBody>
					<SheetFooter>
						<Button type="submit" disabled={invite.isPending || !email.trim()}>
							{invite.isPending ? "Inviting" : "Invite"}
						</Button>
					</SheetFooter>
				</form>
				{guard.dialog}
			</SheetContent>
		</Sheet>
	);
}
