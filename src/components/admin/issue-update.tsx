import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/lib/toast";
import { trpc } from "@/trpc/client";
import type * as React from "react";
import { useState } from "react";

/**
 * "Issue update" from wherever people are selected: pick the letter, and a
 * tracked link is minted for each of them who does not have one yet. The
 * trigger is the caller's, so the same popover hangs off a selection bar
 * and off a row menu. Minting is idempotent (see `links.createForContacts`),
 * so re-issuing to a mixed group is safe and the toast says who was new.
 */
export function IssueUpdate({
	contactIds,
	onDone,
	children,
}: {
	contactIds: string[];
	onDone?: () => void;
	children: React.ReactElement;
}) {
	const utils = trpc.useUtils();
	const [open, setOpen] = useState(false);
	const updates = trpc.updates.list.useQuery(undefined, { enabled: open });

	const mint = trpc.links.createForContacts.useMutation({
		onSuccess: async (result, variables) => {
			await Promise.all([
				utils.updates.list.invalidate(),
				utils.updates.byId.invalidate({ id: variables.updateId }),
				utils.contacts.list.invalidate(),
			]);
			const parts = [
				`${result.created} ${result.created === 1 ? "link" : "links"} minted`,
			];
			if (result.existing) parts.push(`${result.existing} already had one`);
			toast.success(`${parts.join(", ")}. Copy them from the update.`);
			setOpen(false);
			onDone?.();
		},
		onError: (err) => toast.error(err.message),
	});

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>{children}</PopoverTrigger>
			<PopoverContent align="end" className="w-[340px] p-0">
				<Command loop>
					<CommandInput placeholder="Which update" className="text-[13px]" />
					<CommandList className="max-h-[280px]">
						<CommandEmpty>
							{updates.isLoading ? "Loading" : "Nothing matches."}
						</CommandEmpty>
						<CommandGroup>
							{(updates.data ?? []).map((update) => (
								<CommandItem
									key={update.id}
									value={`${update.title} ${update.slug}`}
									disabled={mint.isPending || contactIds.length === 0}
									onSelect={() =>
										mint.mutate({ updateId: update.id, contactIds })
									}
								>
									<span className="truncate">{update.title}</span>
									<span className="ml-auto shrink-0 pl-3 text-[11.5px] text-muted-foreground tabular-nums">
										{update.recipients} sent
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
