import { PostSettings } from "@/components/admin/editor/post-settings";
import { FilterTabs, Page, PageHead } from "@/components/admin/primitives";
import { RecipientsPicker } from "@/components/admin/recipients-picker";
import { useDrawerParam } from "@/components/admin/use-drawer-param";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/toast";
import { trpc } from "@/trpc/client";
import {
	Outlet,
	createFileRoute,
	useNavigate,
	useRouterState,
} from "@tanstack/react-router";
import { Eye, Plus } from "lucide-react";
import { z } from "zod";

/**
 * One post, under two tabs.
 *
 * `sheet`, not `pick`: this branch owns its own search keys, and the parent
 * `/admin/writing` owns `show`. A key the parent has never heard of passes
 * through it untouched.
 *
 * Recipients is a tab rather than a section under the editor because it is a
 * six-column ruled table, and a table like that inside a document column is
 * two layouts fighting. It only appears once the post is a letter.
 */
export const Route = createFileRoute("/admin/writing/$id")({
	validateSearch: z.object({
		sheet: z.enum(["settings"]).optional(),
		pick: z.enum(["people"]).optional(),
	}),
	component: PostPage,
});

function PostPage() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const utils = trpc.useUtils();
	const sheet = useDrawerParam("sheet");
	const pick = useDrawerParam("pick");
	const detail = trpc.posts.byId.useQuery({ id });

	const path = useRouterState({ select: (s) => s.location.pathname });
	const tab = path.endsWith("/recipients") ? "recipients" : "write";

	const post = detail.data?.post;
	const recipients = detail.data?.recipients ?? [];

	/**
	 * What the page chrome knows before the record lands.
	 *
	 * Arriving from the list means the list's own row is already in the cache,
	 * and it carries the name, the slug, the status and the kind: everything
	 * the head and the tab row are made of. Reading it here means the title,
	 * the crumb and the Write/Recipients tabs are right on the first frame,
	 * instead of a tab row appearing a moment later and pushing the document
	 * down the page.
	 */
	const cached = utils.posts.list.getData()?.find((row) => row.id === id);
	const known = post ?? cached;
	const published = known?.status === "published";
	const isLetter = known?.kind === "letter";
	const recipientCount = post ? recipients.length : (cached?.recipients ?? 0);

	/**
	 * Every live link, one per line, addressed. This and Add people belong to
	 * the recipients tab rather than the page, so they sit on the trailing edge
	 * of the tab row: the same place a section's Add button sits everywhere
	 * else, and the only place they line up with the table's gutter.
	 */
	function copyAll() {
		const origin = window.location.origin;
		const lines = recipients
			.filter((row) => !row.revokedAt)
			.map((row) => `${row.contactEmail ?? ""}\t${origin}/u/${row.ref}`);
		navigator.clipboard.writeText(lines.join("\n"));
		toast.success(`${lines.length} copied, one per line.`);
	}

	const save = trpc.posts.update.useMutation({
		onSuccess: async () => {
			await Promise.all([
				utils.posts.byId.invalidate({ id }),
				utils.posts.list.invalidate(),
			]);
		},
		onError: (err) => toast.error(err.message),
	});

	const publish = trpc.posts.publish.useMutation({
		onSuccess: async () => {
			await Promise.all([
				utils.posts.byId.invalidate({ id }),
				utils.posts.list.invalidate(),
			]);
			toast.success("Published.");
		},
		onError: (err) => toast.error(err.message),
	});

	const unpublish = trpc.posts.unpublish.useMutation({
		onSuccess: async () => {
			await Promise.all([
				utils.posts.byId.invalidate({ id }),
				utils.posts.list.invalidate(),
			]);
			toast.success("Back to a draft.");
		},
		onError: (err) => toast.error(err.message),
	});

	const remove = trpc.posts.remove.useMutation({
		onSuccess: async () => {
			await utils.posts.list.invalidate();
			toast.success("Deleted.");
			navigate({ to: "/admin/writing" });
		},
		onError: (err) => toast.error(err.message),
	});

	return (
		<Page>
			<PageHead
				loading={!known}
				title={known?.name || "Untitled"}
				crumbs={[
					{ label: "Writing", to: "/admin/writing" },
					{ label: known?.slug ?? "" },
				]}
				actions={
					!known ? undefined : (
						<>
							<Button
								variant="outline"
								onClick={() =>
									window.open(`/admin/writing/${id}/preview`, "_blank")
								}
							>
								<Eye />
								Preview
							</Button>
							<Button variant="outline" onClick={() => sheet.open("settings")}>
								Settings
							</Button>
							{published ? (
								<Button
									variant="outline"
									onClick={() => unpublish.mutate({ id })}
									disabled={unpublish.isPending}
								>
									Unpublish
								</Button>
							) : (
								<Button
									onClick={() => publish.mutate({ id })}
									disabled={publish.isPending}
								>
									Publish
								</Button>
							)}
						</>
					)
				}
				toolbar={
					// Cold, nothing yet knows whether this is a letter, so the row
					// is reserved: a tab bar that appears a moment after the page
					// does pushes the document down under the reader's eye. It is
					// dropped again for a post that turns out not to be one.
					!known ? (
						<div className="flex items-center gap-1.5">
							<Skeleton className="h-7 w-[4.25rem] rounded-full" />
							<Skeleton className="h-7 w-[6.75rem] rounded-full" />
						</div>
					) : isLetter ? (
						<div className="flex w-full items-center justify-between gap-2">
							<FilterTabs
								value={tab}
								onChange={(next) =>
									navigate({
										to:
											next === "recipients"
												? "/admin/writing/$id/recipients"
												: "/admin/writing/$id",
										params: { id },
									})
								}
								options={[
									{ value: "write" as const, label: "Write" },
									{
										value: "recipients" as const,
										label: "Recipients",
										count: recipientCount,
									},
								]}
							/>
							{tab === "recipients" && (
								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										size="xs"
										onClick={copyAll}
										disabled={recipients.length === 0}
									>
										Copy all
									</Button>
									<Button size="xs" onClick={() => pick.open("people")}>
										<Plus />
										Add people
									</Button>
								</div>
							)}
						</div>
					) : undefined
				}
			/>

			<Outlet />

			{pick.value === "people" && post && (
				<RecipientsPicker
					postId={id}
					postName={post.name}
					linkedContactIds={recipients
						.filter((row) => !row.revokedAt)
						.map((row) => row.contactId)}
					onClose={pick.close}
				/>
			)}

			{sheet.value === "settings" && post && (
				<PostSettings
					values={{
						name: post.name,
						slug: post.slug,
						description: post.description ?? "",
						subtitle: post.subtitle ?? "",
						dateLabel: post.dateLabel ?? "",
						kind: post.kind,
						visibility: post.visibility,
					}}
					published={published}
					hasLinks={recipients.length > 0}
					onSave={(values) =>
						save.mutate({
							id,
							name: values.name,
							slug: values.slug,
							description: values.description,
							subtitle: values.subtitle,
							dateLabel: values.dateLabel,
							kind: values.kind,
							visibility: values.visibility,
						})
					}
					onDelete={() => remove.mutate({ id })}
					onClose={sheet.close}
				/>
			)}
		</Page>
	);
}
