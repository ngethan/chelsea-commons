import {
	Page,
	PageBody,
	PageHead,
	PageScroll,
	TableCard,
	Tinted,
} from "@/components/admin/primitives";
import { ConfirmButton } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floating-field";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { toast } from "@/lib/toast";
import { trpc } from "@/trpc/client";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/admin/settings")({
	component: Settings,
});

function Settings() {
	const session = trpc.auth.session.useQuery();

	return (
		<Page>
			<PageHead title="Settings" />
			<PageScroll>
				<PageBody className="flex max-w-[720px] flex-col gap-6">
					<TableCard title="Signed in as">
						<Table>
							<TableBody>
								<TableRow className="hover:bg-transparent">
									<TableCell className="w-[160px] pl-4 text-muted-foreground">
										Name
									</TableCell>
									<TableCell>{session.data?.name ?? "—"}</TableCell>
								</TableRow>
								<TableRow className="hover:bg-transparent">
									<TableCell className="pl-4 text-muted-foreground">
										Email
									</TableCell>
									<TableCell className="font-mono text-[12px]">
										{session.data?.email ?? "—"}
									</TableCell>
								</TableRow>
							</TableBody>
						</Table>
					</TableCard>

					<Tags />

					<SearchIndex />

					<div>
						<Button asChild variant="outline" size="sm">
							<Link to="/admin/access" className="no-underline">
								Manage who can sign in
							</Link>
						</Button>
					</div>
				</PageBody>
			</PageScroll>
		</Page>
	);
}

/**
 * How much of the list the semantic search can see. Every save re-embeds
 * its own row, so this is mostly for the first run and for the day the
 * embedding key was missing for a while.
 */
function SearchIndex() {
	const utils = trpc.useUtils();
	const status = trpc.search.status.useQuery();

	const reindex = trpc.search.reindex.useMutation({
		onSuccess: async (result) => {
			await utils.search.status.invalidate();
			const indexed =
				result.contacts.indexed +
				result.organizations.indexed +
				result.updates.indexed;
			toast.success(
				indexed === 0 ? "Nothing had changed." : `${indexed} embedded.`,
			);
		},
		onError: (err) => toast.error(err.message),
	});

	const rows = status.data
		? [
				["Contacts", status.data.contacts],
				["Organizations", status.data.organizations],
				["Updates", status.data.updates],
			]
		: [];

	return (
		<TableCard
			title="Search index"
			right={
				status.data ? (
					status.data.configured ? (
						<Tinted tone="success">Embeddings on</Tinted>
					) : (
						<Tinted tone="warning">No OPENAI_API_KEY</Tinted>
					)
				) : null
			}
		>
			<Table>
				<TableBody>
					{rows.map(([label, counts]) => (
						<TableRow key={String(label)} className="hover:bg-transparent">
							<TableCell className="w-[160px] pl-4 text-muted-foreground">
								{String(label)}
							</TableCell>
							<TableCell className="tabular-nums">
								{typeof counts === "object"
									? `${counts.embedded} of ${counts.total} embedded`
									: null}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
			<div className="flex items-center gap-2 border-t border-border px-4 py-3">
				<Button
					size="sm"
					variant="outline"
					disabled={reindex.isPending || !status.data?.configured}
					onClick={() => reindex.mutate({ force: false })}
				>
					{reindex.isPending ? "Embedding" : "Embed what changed"}
				</Button>
				<Button
					size="sm"
					variant="text"
					disabled={reindex.isPending || !status.data?.configured}
					onClick={() => reindex.mutate({ force: true })}
				>
					Re-embed everything
				</Button>
			</div>
		</TableCard>
	);
}

/**
 * Every tag, how many people carry it, and the two things only this
 * screen can do: rename it everywhere, and delete it everywhere. Making a
 * tag happens where it is first needed, in a person's tags field.
 */
function Tags() {
	const utils = trpc.useUtils();
	const tags = trpc.tags.list.useQuery();

	const refresh = () =>
		Promise.all([
			utils.tags.list.invalidate(),
			utils.contacts.list.invalidate(),
		]);

	const remove = trpc.tags.remove.useMutation({
		onSuccess: async (result) => {
			await refresh();
			toast.success(
				result.removedFrom
					? `Deleted, and taken off ${result.removedFrom}.`
					: "Deleted.",
			);
		},
		onError: (err) => toast.error(err.message),
	});

	const rows = tags.data ?? [];

	return (
		<TableCard title="Tags">
			{rows.length === 0 && (
				<div className="px-4 py-6 text-center text-[13px] text-muted-foreground">
					{tags.isLoading ? "Loading" : "None yet."}
				</div>
			)}
			{rows.length > 0 && (
				<Table>
					<TableBody>
						{rows.map((t) => (
							<TableRow key={t.id} className="hover:bg-transparent">
								<TableCell className="pl-4">{t.name}</TableCell>
								<TableCell className="w-[100px] text-right text-muted-foreground tabular-nums">
									{t.count}
								</TableCell>
								<TableCell className="w-[80px] text-right">
									<div className="flex items-center justify-end gap-0.5">
										<RenameTag id={t.id} name={t.name} onDone={refresh} />
										<ConfirmButton
											title={`Delete “${t.name}”?`}
											description={
												t.count
													? `It comes off ${t.count} ${t.count === 1 ? "person" : "people"}.`
													: "Nobody has it."
											}
											action="Delete"
											onConfirm={() => remove.mutate({ id: t.id })}
										>
											<Button variant="icon" size="icon-xs" title="Delete">
												<Trash2 />
												<span className="sr-only">Delete</span>
											</Button>
										</ConfirmButton>
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</TableCard>
	);
}

function RenameTag({
	id,
	name,
	onDone,
}: {
	id: string;
	name: string;
	onDone: () => Promise<unknown>;
}) {
	const [open, setOpen] = useState(false);
	const [value, setValue] = useState(name);

	const rename = trpc.tags.rename.useMutation({
		onSuccess: async () => {
			await onDone();
			setOpen(false);
		},
		onError: (err) => toast.error(err.message),
	});

	return (
		<Popover
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (next) setValue(name);
			}}
		>
			<PopoverTrigger asChild>
				<Button variant="icon" size="icon-xs" title="Rename">
					<Pencil />
					<span className="sr-only">Rename</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-[300px] p-4">
				<form
					className="flex flex-col gap-3"
					onSubmit={(e) => {
						e.preventDefault();
						if (value.trim() && value.trim() !== name)
							rename.mutate({ id, name: value.trim() });
					}}
				>
					<FloatingInput
						label="Name"
						value={value}
						onChange={(e) => setValue(e.target.value)}
						autoFocus
					/>
					<div className="flex justify-end">
						<Button
							type="submit"
							size="sm"
							disabled={
								rename.isPending || !value.trim() || value.trim() === name
							}
						>
							{rename.isPending ? "Renaming" : "Rename"}
						</Button>
					</div>
				</form>
			</PopoverContent>
		</Popover>
	);
}
