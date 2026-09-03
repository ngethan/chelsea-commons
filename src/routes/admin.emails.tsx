import { renderCampaignEmail, trackedLinkUrl } from "@/lib/campaign";
import {
	type CampaignRow,
	type SendEvent,
	deleteSend,
	getCampaignReport,
	getSendEvents,
	sendCampaign,
	sendCampaignPreview,
} from "@/lib/investor-emails";
import { postPath } from "@/lib/post-path";
import type { PostSummary } from "@/lib/posts-server";
import { fetchAllPostSummaries } from "@/lib/posts-server";
import { parseRecipients } from "@/lib/recipients";
import { errorText } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { buildSeoTags } from "../site-config";

export const Route = createFileRoute("/admin/emails")({
	head: () =>
		buildSeoTags({
			title: "Email tracker | Chelsea Commons",
			description: "Internal.",
			path: "/admin/emails",
			robots: "noindex, nofollow",
		}),
	component: AdminEmails,
	ssr: false,
});

const PASSWORD_KEY = "cc-admin-password";
const DEFAULT_BASE_URL = "https://chelseacommons.co";

/** Seconds included: a prefetch and a real open can share a minute. */
function formatDateTime(value: Date | string) {
	return new Date(value).toLocaleString(undefined, {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
		second: "2-digit",
	});
}

function formatDate(value: Date | string | null) {
	if (!value) return "—";
	return new Date(value).toLocaleString(undefined, {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

function Field({
	label,
	htmlFor,
	children,
}: {
	label: string;
	htmlFor: string;
	children: React.ReactNode;
}) {
	return (
		<div className="block">
			<label
				htmlFor={htmlFor}
				className="mb-2 block font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
			>
				{label}
			</label>
			{children}
		</div>
	);
}

const inputClass =
	"w-full border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-ring";

const buttonClass =
	"h-9 px-4 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors";

const outlineButtonClass =
	"h-9 px-4 text-sm font-medium border border-input text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors";

/**
 * The raw event trail for one recipient. Opens and clicks are shown together
 * because the useful question is usually "what did this person actually do",
 * and the user agent is what tells a real open apart from a mail-provider
 * image prefetch.
 */
function EventLog({
	events,
	loading,
}: { events: SendEvent[] | null; loading: boolean }) {
	if (!events) {
		return (
			<p className="text-muted-foreground text-xs">
				{loading ? "Loading events..." : "No events loaded."}
			</p>
		);
	}

	if (events.length === 0) {
		return (
			<p className="text-muted-foreground text-xs">
				Nothing recorded yet. No open, no click.
			</p>
		);
	}

	return (
		<ol className="space-y-1.5">
			{events.map((event) => (
				<li
					key={event.id}
					className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-xs"
				>
					<span
						className={
							event.kind === "click"
								? "text-foreground"
								: "text-muted-foreground"
						}
					>
						{event.kind === "click" ? "CLICK" : "OPEN "}
					</span>
					<span className="text-muted-foreground">
						{formatDateTime(event.created_at)}
					</span>
					{event.target && (
						<span className="text-muted-foreground">{event.target}</span>
					)}
					{event.ip && (
						<span className="text-muted-foreground">{event.ip}</span>
					)}
					{event.user_agent && (
						<span
							className="max-w-full truncate text-muted-foreground/70"
							title={event.user_agent}
						>
							{event.user_agent}
						</span>
					)}
				</li>
			))}
		</ol>
	);
}

function AdminEmails() {
	// Fetched rather than imported: importing the post module would pull every
	// post's full text into this page's bundle, private letters included.
	const [posts, setPosts] = useState<PostSummary[]>([]);
	const [password, setPassword] = useState("");
	const [unlocked, setUnlocked] = useState(false);
	const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
	const [slug, setSlug] = useState("");
	// The subject defaults to the selected post's name and follows it when you
	// switch posts. Typing your own wins until you pick a different post.
	const [subjectOverride, setSubjectOverride] = useState<string | null>(null);
	const selectedPost = posts.find((p) => p.slug === slug);
	const subject = subjectOverride ?? selectedPost?.name ?? "";
	const [raw, setRaw] = useState("");
	const [previewTo, setPreviewTo] = useState("");
	const [rows, setRows] = useState<CampaignRow[]>([]);
	const [status, setStatus] = useState("");
	const [busy, setBusy] = useState(false);
	const [filter, setFilter] = useState("");
	// Events load on demand: the table is a summary and most rows never get
	// opened. Only one row is open at a time, so one list is all the state
	// needed.
	const [openRef, setOpenRef] = useState<string | null>(null);
	const [events, setEvents] = useState<SendEvent[] | null>(null);

	useEffect(() => {
		const saved = sessionStorage.getItem(PASSWORD_KEY);
		if (saved) {
			setPassword(saved);
		}
	}, []);

	const { recipients, invalid } = useMemo(() => parseRecipients(raw), [raw]);

	const refresh = useCallback(async (pw: string) => {
		const [report, postList] = await Promise.all([
			getCampaignReport({ data: { password: pw } }),
			fetchAllPostSummaries({ data: { password: pw } }),
		]);
		setRows(report.rows);
		setPosts(postList.posts);
		setSlug((current) =>
			postList.posts.some((p) => p.slug === current)
				? current
				: (postList.posts[0]?.slug ?? ""),
		);
	}, []);

	/**
	 * Every action shares the same shape: disable the form, show progress,
	 * surface the error if there is one, re-enable. Written out per handler it
	 * had already drifted, with Refresh skipping the busy flag entirely.
	 */
	const run = useCallback(
		async (pending: string, fn: () => Promise<string>) => {
			setBusy(true);
			setStatus(pending);
			try {
				setStatus(await fn());
			} catch (err) {
				setStatus(errorText(err));
			} finally {
				setBusy(false);
			}
		},
		[],
	);

	const handleUnlock = () =>
		run("Checking...", async () => {
			await refresh(password);
			sessionStorage.setItem(PASSWORD_KEY, password);
			setUnlocked(true);
			return "";
		});

	const handleSend = () =>
		run("Sending...", async () => {
			if (recipients.length === 0) return "No recipients.";
			const confirmed = window.confirm(
				`Send "${subject}" to ${recipients.length} ${
					recipients.length === 1 ? "person" : "people"
				}?\n\nLinks will point at ${baseUrl}${postPath(slug)}.`,
			);
			if (!confirmed) return "Cancelled.";

			const result = await sendCampaign({
				data: { password, baseUrl, slug, subject, recipients },
			});
			setRaw("");
			await refresh(password);
			return `Sent ${result.sent} of ${result.total}${
				result.failed ? `, ${result.failed} failed` : ""
			}.`;
		});

	const handlePreviewSend = () =>
		run("Sending preview...", async () => {
			if (!previewTo.includes("@")) {
				return "Enter an address to send the preview to.";
			}
			const result = await sendCampaignPreview({
				data: { password, baseUrl, slug, subject, to: previewTo },
			});
			await refresh(password);
			return `Preview sent. ref=${result.ref}`;
		});

	const handleDelete = (ref: string) =>
		run("Deleting...", async () => {
			if (!window.confirm(`Delete the row for ${ref}? Its events go too.`)) {
				return "Cancelled.";
			}
			await deleteSend({ data: { password, ref } });
			if (openRef === ref) setOpenRef(null);
			await refresh(password);
			return `Deleted ${ref}.`;
		});

	const toggleEvents = (ref: string) => {
		if (openRef === ref) {
			setOpenRef(null);
			return;
		}
		setOpenRef(ref);
		setEvents(null);
		// Always refetch: a row opened earlier may have collected events since.
		return run("", async () => {
			const result = await getSendEvents({ data: { password, ref } });
			setEvents(result.events);
			return "";
		});
	};

	// Rendered with a fake ref so the visualizer never writes a row.
	const previewHtml = useMemo(
		() =>
			renderCampaignEmail({
				ref: "preview01",
				name: recipients[0]?.name ?? null,
				baseUrl,
				description: selectedPost?.description,
			}),
		[recipients[0]?.name, baseUrl, selectedPost?.description],
	);

	const visibleRows = useMemo(() => {
		const needle = filter.trim().toLowerCase();
		if (!needle) return rows;
		return rows.filter((row) =>
			`${row.email} ${row.name ?? ""}`.toLowerCase().includes(needle),
		);
	}, [rows, filter]);

	// Counts follow the filter, so narrowing to one investor answers "did they
	// open it" without reading the row.
	const totals = useMemo(() => {
		const opened = visibleRows.filter((r) => r.opens > 0).length;
		const clicked = visibleRows.filter((r) => r.clicks > 0).length;
		return { sends: visibleRows.length, opened, clicked };
	}, [visibleRows]);

	if (!unlocked) {
		return (
			<main className="flex min-h-svh items-center justify-center bg-background px-6">
				<div className="w-full max-w-sm space-y-4">
					<h1 className="font-serif text-2xl text-foreground">Email tracker</h1>
					<Field label="Admin password" htmlFor="admin-password">
						<input
							id="admin-password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") handleUnlock();
							}}
							className={inputClass}
						/>
					</Field>
					<button
						type="button"
						onClick={handleUnlock}
						disabled={busy || !password}
						className={buttonClass}
					>
						{busy ? "Checking..." : "Unlock"}
					</button>
					{status && <p className="text-sm text-destructive">{status}</p>}
				</div>
			</main>
		);
	}

	return (
		<main className="min-h-svh bg-background">
			<div className="mx-auto max-w-6xl space-y-12 px-6 py-12 md:px-8">
				<header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
					<div>
						<h1 className="font-serif text-3xl text-foreground">
							Email tracker
						</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							{selectedPost?.name ?? "No post selected"}
						</p>
					</div>
					<div className="flex gap-8 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
						<span>
							<strong className="block font-sans text-2xl font-medium tracking-normal text-foreground">
								{totals.sends}
							</strong>
							sent
						</span>
						<span>
							<strong className="block font-sans text-2xl font-medium tracking-normal text-foreground">
								{totals.opened}
							</strong>
							opened
						</span>
						<span>
							<strong className="block font-sans text-2xl font-medium tracking-normal text-foreground">
								{totals.clicked}
							</strong>
							clicked
						</span>
					</div>
				</header>

				<div className="grid gap-10 lg:grid-cols-2">
					<section className="space-y-5">
						<h2 className="font-serif text-xl text-foreground">Send</h2>

						<Field label="Post to send" htmlFor="update-slug">
							<select
								id="update-slug"
								value={slug}
								onChange={(e) => {
									setSlug(e.target.value);
									setSubjectOverride(null);
								}}
								className={inputClass}
							>
								{posts.length === 0 && (
									<option value="">No posts in content/blog</option>
								)}
								{posts.map((p) => (
									<option key={p.slug} value={p.slug}>
										{p.name} ({p.date}){" "}
										{p.visibility === "private" ? "· private" : "· public"}
									</option>
								))}
							</select>
						</Field>

						<Field label="Subject" htmlFor="subject">
							<input
								id="subject"
								value={subject}
								onChange={(e) => setSubjectOverride(e.target.value)}
								className={inputClass}
							/>
						</Field>

						<Field label="Base URL for tracked links" htmlFor="base-url">
							<input
								id="base-url"
								value={baseUrl}
								onChange={(e) => setBaseUrl(e.target.value)}
								className={inputClass}
							/>
						</Field>

						<Field label="Recipients (one per line)" htmlFor="recipients">
							<textarea
								id="recipients"
								value={raw}
								onChange={(e) => setRaw(e.target.value)}
								rows={10}
								spellCheck={false}
								placeholder={
									"jane@example.com\nJane Doe <jane@example.com>\nJane Doe, jane@example.com"
								}
								className={`${inputClass} font-mono text-xs leading-relaxed`}
							/>
						</Field>

						<p className="text-sm text-muted-foreground">
							{recipients.length} valid
							{invalid.length > 0 && (
								<span className="text-destructive">
									{" "}
									| {invalid.length} unparseable:{" "}
									{invalid.slice(0, 3).join(", ")}
									{invalid.length > 3 ? "..." : ""}
								</span>
							)}
						</p>

						<button
							type="button"
							onClick={handleSend}
							disabled={busy || recipients.length === 0 || !slug}
							className={buttonClass}
						>
							{busy ? "Working..." : `Send to ${recipients.length}`}
						</button>

						<div className="border-t border-border pt-5">
							<Field label="Send a preview to yourself" htmlFor="preview-to">
								<div className="flex gap-2">
									<input
										id="preview-to"
										value={previewTo}
										onChange={(e) => setPreviewTo(e.target.value)}
										placeholder="you@example.com"
										className={inputClass}
									/>
									<button
										type="button"
										onClick={handlePreviewSend}
										disabled={busy}
										className={outlineButtonClass}
									>
										Send
									</button>
								</div>
							</Field>
						</div>

						{status && (
							<output className="block text-sm text-foreground">
								{status}
							</output>
						)}
					</section>

					<section className="space-y-3">
						<div className="flex items-baseline justify-between">
							<h2 className="font-serif text-xl text-foreground">
								Email preview
							</h2>
							<span className="font-mono text-[11px] text-muted-foreground">
								{trackedLinkUrl(baseUrl, "preview01")} → {postPath(slug)}
							</span>
						</div>
						{/* srcDoc isolates the email from the page. The email itself
						    carries no styling, so the wrapper supplies a mail client's
						    default reading font: without it the preview would show
						    Times New Roman and misrepresent every inbox. */}
						<iframe
							title="Email preview"
							srcDoc={`<meta charset="utf-8"><div style="padding:16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#222">${previewHtml}</div>`}
							className="h-[620px] w-full border border-border bg-card"
						/>
					</section>
				</div>

				<section className="space-y-4">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<h2 className="font-serif text-xl text-foreground">Sends</h2>
						<div className="flex items-center gap-2">
							<input
								id="row-filter"
								value={filter}
								onChange={(e) => setFilter(e.target.value)}
								placeholder="Filter by email or name"
								aria-label="Filter sends by email or name"
								className={`${inputClass} w-64`}
							/>
							{filter && (
								<button
									type="button"
									onClick={() => setFilter("")}
									className="text-muted-foreground text-xs hover:text-foreground"
								>
									Clear
								</button>
							)}
							<button
								type="button"
								onClick={() =>
									run("Refreshing...", async () => {
										await refresh(password);
										return "";
									})
								}
								disabled={busy}
								className={outlineButtonClass}
							>
								Refresh
							</button>
						</div>
					</div>

					{rows.length === 0 ? (
						<p className="text-sm text-muted-foreground">Nothing sent yet.</p>
					) : visibleRows.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No sends match “{filter}”.
						</p>
					) : (
						<div className="overflow-x-auto border border-border">
							<table className="w-full min-w-[52rem] text-sm">
								<thead className="bg-secondary text-left font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
									<tr>
										<th className="px-3 py-2 font-normal">Recipient</th>
										<th className="px-3 py-2 font-normal">Ref</th>
										<th className="px-3 py-2 font-normal">Post</th>
										<th className="px-3 py-2 font-normal">Sent</th>
										<th className="px-3 py-2 font-normal">Opens</th>
										<th className="px-3 py-2 font-normal">First open</th>
										<th className="px-3 py-2 font-normal">Clicks</th>
										<th className="px-3 py-2 font-normal">First click</th>
										<th className="px-3 py-2 font-normal" />
									</tr>
								</thead>
								<tbody>
									{visibleRows.map((row) => (
										<Fragment key={row.ref}>
											<tr className="border-t border-border align-top">
												<td className="px-3 py-2">
													<span className="block text-foreground">
														{row.name || "—"}
													</span>
													<span className="block text-xs text-muted-foreground">
														{row.email}
													</span>
													{row.status !== "sent" && (
														<span className="block text-xs text-destructive">
															{row.status}
															{row.error ? `: ${row.error}` : ""}
														</span>
													)}
												</td>
												<td className="px-3 py-2 font-mono text-xs">
													<a
														href={trackedLinkUrl(baseUrl, row.ref)}
														target="_blank"
														rel="noreferrer"
														className="text-muted-foreground hover:text-foreground"
													>
														{row.ref}
													</a>
												</td>
												<td className="px-3 py-2 font-mono text-muted-foreground text-xs">
													{row.destination?.replace("/writing/", "") ?? "—"}
												</td>
												<td className="px-3 py-2 text-xs text-muted-foreground">
													{formatDate(row.created_at)}
												</td>
												<td className="px-3 py-2 tabular-nums text-foreground">
													{row.opens}
												</td>
												<td className="px-3 py-2 text-xs text-muted-foreground">
													{formatDate(row.first_open)}
												</td>
												<td className="px-3 py-2 tabular-nums text-foreground">
													{row.clicks}
												</td>
												<td className="px-3 py-2 text-xs text-muted-foreground">
													{formatDate(row.first_click)}
												</td>
												<td className="space-x-3 whitespace-nowrap px-3 py-2 text-right">
													<button
														type="button"
														onClick={() => toggleEvents(row.ref)}
														className="text-muted-foreground text-xs hover:text-foreground"
														aria-expanded={openRef === row.ref}
													>
														{openRef === row.ref ? "Hide" : "Events"}
													</button>
													<button
														type="button"
														onClick={() => handleDelete(row.ref)}
														className="text-muted-foreground text-xs hover:text-destructive"
													>
														Delete
													</button>
												</td>
											</tr>
											{openRef === row.ref && (
												<tr className="border-border border-t bg-secondary/40">
													<td colSpan={9} className="px-3 py-3">
														<EventLog events={events} loading={busy} />
													</td>
												</tr>
											)}
										</Fragment>
									))}
								</tbody>
							</table>
						</div>
					)}

					<p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
						Opens come from a 1x1 pixel, so they undercount anyone with images
						off and overcount when Gmail or Outlook prefetches the image on the
						recipient's behalf. Clicks are the reliable signal: they only fire
						when someone actually follows their /u/ link.
					</p>
				</section>
			</div>
		</main>
	);
}
