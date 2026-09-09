import {
	Page,
	PageBody,
	PageHead,
	PageScroll,
	TableCard,
	Tinted,
} from "@/components/admin/primitives";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { toast } from "@/lib/toast";
import { trpc } from "@/trpc/client";
import { Link, createFileRoute } from "@tanstack/react-router";

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
