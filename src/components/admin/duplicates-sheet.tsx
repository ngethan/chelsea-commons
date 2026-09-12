import { PersonAvatar } from "@/components/admin/person-avatar";
import { Empty, Mono } from "@/components/admin/primitives";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetBody,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { toast } from "@/lib/toast";
import { trpc } from "@/trpc/client";
import { useState } from "react";

const day = (value: Date | string) =>
	new Date(value).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});

/**
 * People who may be one person, and two ways out per group: keep one of
 * them (the others fold into it), or say they are different and stop being
 * asked. Nothing here is automatic, and merging is a soft delete of the
 * rows folded in, so it can be undone by hand like any other delete.
 */
export function DuplicatesSheet({
	onClose,
	onView,
}: {
	onClose: () => void;
	/** Open one of the people, so they can be looked at before deciding. */
	onView: (id: string) => void;
}) {
	const utils = trpc.useUtils();
	const groups = trpc.contacts.duplicates.useQuery();
	const [busy, setBusy] = useState<string | null>(null);

	const refresh = () =>
		Promise.all([
			utils.contacts.duplicates.invalidate(),
			utils.contacts.list.invalidate(),
		]);

	const merge = trpc.contacts.merge.useMutation({
		onError: (err) => toast.error(err.message),
	});
	const dismiss = trpc.contacts.dismissDuplicate.useMutation({
		onError: (err) => toast.error(err.message),
	});

	async function keep(keepId: string, ids: string[]) {
		setBusy(keepId);
		try {
			let folded = 0;
			for (const dropId of ids) {
				if (dropId === keepId) continue;
				await merge.mutateAsync({ keepId, dropId });
				folded += 1;
			}
			await refresh();
			toast.success(folded === 1 ? "Merged." : `Merged ${folded}.`);
		} finally {
			setBusy(null);
		}
	}

	async function notSame(ids: string[]) {
		setBusy(ids.join(":"));
		try {
			for (let i = 0; i < ids.length; i++)
				for (let j = i + 1; j < ids.length; j++)
					await dismiss.mutateAsync({ a: ids[i], b: ids[j] });
			await refresh();
		} finally {
			setBusy(null);
		}
	}

	const rows = groups.data ?? [];

	return (
		<Sheet open onOpenChange={(open) => !open && onClose()}>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>Possible duplicates</SheetTitle>
					<SheetDescription>
						{rows.length === 0
							? "Nothing to resolve."
							: `${rows.length} ${rows.length === 1 ? "group" : "groups"}`}
					</SheetDescription>
				</SheetHeader>

				<SheetBody className="flex flex-col gap-8">
					{groups.isLoading && <Empty>Loading.</Empty>}
					{!groups.isLoading && rows.length === 0 && (
						<Empty>Nothing to resolve.</Empty>
					)}
					{rows.map((group) => {
						const ids = group.contacts.map((c) => c.id);
						const key = ids.join(":");
						return (
							<section key={key} className="border border-border">
								<Table>
									<TableBody>
										{group.contacts.map((c) => (
											<TableRow key={c.id} className="hover:bg-transparent">
												<TableCell className="w-[56px] pr-0 align-middle">
													<PersonAvatar person={c} />
												</TableCell>
												<TableCell className="align-middle">
													<button
														type="button"
														onClick={() => onView(c.id)}
														className="cursor-pointer text-left text-[14px] font-medium hover:underline"
													>
														{c.name || c.email || "Unnamed"}
													</button>
													<div className="mt-0.5 flex items-center gap-2 text-[12.5px] text-muted-foreground">
														{c.email && <Mono>{c.email}</Mono>}
														{c.email && (
															<span className="text-muted-foreground/50">
																·
															</span>
														)}
														<span>{day(c.createdAt)}</span>
													</div>
												</TableCell>
												<TableCell className="w-[110px] align-middle text-right">
													<Button
														variant="outline"
														size="sm"
														disabled={busy !== null}
														onClick={() => keep(c.id, ids)}
													>
														{busy === c.id ? "Merging" : "Keep this"}
													</Button>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
								<div className="flex justify-end border-t border-border px-3 py-2">
									<Button
										variant="text"
										size="xs"
										disabled={busy !== null}
										onClick={() => notSame(ids)}
									>
										Not the same person
									</Button>
								</div>
							</section>
						);
					})}
				</SheetBody>
			</SheetContent>
		</Sheet>
	);
}
