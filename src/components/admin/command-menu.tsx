import { PersonAvatar } from "@/components/admin/person-avatar";
import { FilterTabs, StatusBadge } from "@/components/admin/primitives";
import {
	CommandDialog,
	CommandEmpty,
	CommandFooter,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import type { SearchHit, SearchKind } from "@/server/search";
import { trpc } from "@/trpc/client";
import { keepPreviousData } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
	Building2,
	ClipboardPaste,
	CreativeCommons,
	FileText,
	KeyRound,
	Plus,
	Settings,
	Sparkles,
	User,
	Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

/**
 * Command-K.
 *
 * Idle, it is a launcher: the pages, the four things you can make, and the
 * people most recently touched. Typing turns it into search, and the search
 * is the server's: `search.query` runs a literal match and then the vectors,
 * and returns one list with each row saying which it came from. cmdk's own
 * filtering is off (`shouldFilter={false}`) because it would fuzzy-match the
 * server's answers a second time and hide the semantic ones, whose titles
 * need not contain the words you typed.
 *
 * The query is kept across opens, the way a browser keeps its find bar: the
 * second reach for cmd+K is usually for the same thing.
 */

type Tab = "all" | SearchKind;

const NAV = [
	{ label: "Contacts", to: "/admin/contacts", icon: Users },
	{ label: "Organizations", to: "/admin/organizations", icon: Building2 },
	{ label: "Updates", to: "/admin/updates", icon: FileText },
	{ label: "Access", to: "/admin/access", icon: KeyRound },
	{ label: "Settings", to: "/admin/settings", icon: Settings },
] as const;

const ACTIONS = [
	{
		label: "Add somebody",
		to: "/admin/contacts",
		search: { sheet: "new" },
		icon: Plus,
	},
	{
		label: "Paste a list of addresses",
		to: "/admin/contacts",
		search: { sheet: "import" },
		icon: ClipboardPaste,
	},
	{
		label: "New update",
		to: "/admin/updates",
		search: { sheet: "new" },
		icon: FileText,
	},
	{
		label: "Let somebody in",
		to: "/admin/access",
		search: { sheet: "invite" },
		icon: KeyRound,
	},
] as const;

const KIND_LABEL: Record<SearchKind, string> = {
	contact: "People",
	organization: "Organizations",
	update: "Updates",
};

const KIND_ICON = {
	contact: User,
	organization: Building2,
	update: FileText,
} as const;

function matches(label: string, q: string) {
	return !q || label.toLowerCase().includes(q.toLowerCase());
}

/**
 * How sure the vectors are, as a dot and a number. The thresholds are for
 * `text-embedding-3-small`, where 0.6 is a clear match and 0.45 a plausible
 * one; the number is shown so the thresholds can be judged by eye.
 */
function Similarity({ score }: { score: number }) {
	return (
		<span
			className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground tabular-nums"
			title={`${Math.round(score * 100)}% match`}
		>
			<span
				className={cn(
					"size-1.5 rounded-full",
					score >= 0.6
						? "bg-success"
						: score >= 0.45
							? "bg-warning"
							: "bg-muted-foreground/60",
				)}
			/>
			{Math.round(score * 100)}%
		</span>
	);
}

function HitRow({ hit, onSelect }: { hit: SearchHit; onSelect: () => void }) {
	const Icon = KIND_ICON[hit.kind];
	return (
		<CommandItem value={`${hit.kind}:${hit.id}`} onSelect={onSelect}>
			{hit.kind === "contact" ? (
				<PersonAvatar
					person={{ id: hit.id, name: hit.title, email: hit.subtitle }}
					size="xs"
				/>
			) : (
				<Icon />
			)}
			<div className="flex min-w-0 flex-1 items-baseline gap-2">
				<span className="truncate">{hit.title}</span>
				{hit.subtitle && (
					<span className="truncate font-mono text-[11px] text-muted-foreground">
						{hit.subtitle}
					</span>
				)}
			</div>
			<div className="ml-2 flex shrink-0 items-center gap-2">
				{hit.status && <StatusBadge status={hit.status} />}
				{hit.similarity !== null && <Similarity score={hit.similarity} />}
			</div>
		</CommandItem>
	);
}

export function CommandMenu({
	open,
	onOpenChange,
	onAsk,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Opens the assistant's drawer. */
	onAsk?: () => void;
}) {
	const navigate = useNavigate();
	const [search, setSearch] = useState("");
	const [tab, setTab] = useState<Tab>("all");

	// One request per pause in typing, not per keystroke: each one may be an
	// embedding call.
	const debounced = useDebouncedValue(search, 250);
	const q = debounced.trim();

	const results = trpc.search.query.useQuery(
		{ q },
		{
			enabled: open && q.length > 0,
			placeholderData: keepPreviousData,
			staleTime: 60_000,
		},
	);
	const recent = trpc.search.recent.useQuery(undefined, { enabled: open });

	// The tab is about one answer. The query survives a close; the tab does not.
	useEffect(() => {
		if (!open) setTab("all");
	}, [open]);

	const hits = q.length > 0 ? (results.data?.hits ?? []) : [];
	const counts = useMemo(() => {
		const c: Record<SearchKind, number> = {
			contact: 0,
			organization: 0,
			update: 0,
		};
		for (const hit of hits) c[hit.kind] += 1;
		return c;
	}, [hits]);

	const shown = tab === "all" ? hits : hits.filter((h) => h.kind === tab);
	const grouped = (["contact", "organization", "update"] as const)
		.map((kind) => ({ kind, hits: shown.filter((h) => h.kind === kind) }))
		.filter((g) => g.hits.length > 0);

	const nav = NAV.filter((item) => matches(item.label, q));
	const actions = ACTIONS.filter((item) => matches(item.label, q));

	const pending =
		open &&
		search.trim().length > 0 &&
		(search.trim() !== q || results.isFetching);

	function go(to: string, search?: Record<string, string>) {
		onOpenChange(false);
		navigate({ to, search });
	}

	function open_(hit: SearchHit) {
		if (hit.kind === "contact")
			return go("/admin/contacts", { contact: hit.id });
		if (hit.kind === "organization")
			return go("/admin/organizations", { org: hit.id });
		onOpenChange(false);
		navigate({ to: "/admin/updates/$id", params: { id: hit.id } });
	}

	return (
		<CommandDialog
			open={open}
			onOpenChange={onOpenChange}
			shouldFilter={false}
			loop
		>
			<CommandInput
				value={search}
				onValueChange={setSearch}
				loading={pending}
				placeholder="Search people, organizations, updates"
			/>

			{hits.length > 0 && (
				<div className="flex items-center border-b border-border px-2 py-1.5">
					<FilterTabs
						value={tab}
						onChange={setTab}
						options={[
							{ value: "all" as Tab, label: "All", count: hits.length },
							...(["contact", "organization", "update"] as const)
								.filter((kind) => counts[kind] > 0)
								.map((kind) => ({
									value: kind as Tab,
									label: KIND_LABEL[kind],
									count: counts[kind],
								})),
						]}
					/>
				</div>
			)}

			<CommandList>
				<CommandEmpty>
					{pending
						? "Searching"
						: q
							? "Nothing matches that."
							: "Nothing here yet."}
				</CommandEmpty>

				{!q && (recent.data?.length ?? 0) > 0 && (
					<CommandGroup heading="Recent">
						{recent.data?.map((row) => (
							<CommandItem
								key={row.id}
								value={`recent:${row.id}`}
								onSelect={() => go("/admin/contacts", { contact: row.id })}
							>
								<PersonAvatar person={row} size="xs" />
								<div className="flex min-w-0 flex-1 items-baseline gap-2">
									<span className="truncate">
										{row.name || row.email || "Unnamed"}
									</span>
									{row.name && (
										<span className="truncate font-mono text-[11px] text-muted-foreground">
											{row.email}
										</span>
									)}
								</div>
								<div className="ml-2 flex shrink-0 items-center gap-2">
									{row.organizationName && (
										<span className="truncate text-[11.5px] text-muted-foreground">
											{row.organizationName}
										</span>
									)}
									<StatusBadge status={row.status} />
								</div>
							</CommandItem>
						))}
					</CommandGroup>
				)}

				{grouped.map((group) => (
					<CommandGroup key={group.kind} heading={KIND_LABEL[group.kind]}>
						{group.hits.map((hit) => (
							<HitRow
								key={`${hit.kind}:${hit.id}`}
								hit={hit}
								onSelect={() => open_(hit)}
							/>
						))}
					</CommandGroup>
				))}

				{nav.length > 0 && (
					<CommandGroup heading="Go to">
						{nav.map((item) => (
							<CommandItem
								key={item.to}
								value={`nav:${item.to}`}
								onSelect={() => go(item.to)}
							>
								<item.icon />
								<span>{item.label}</span>
							</CommandItem>
						))}
					</CommandGroup>
				)}

				{(actions.length > 0 || (onAsk && matches("Ask AI", q))) && (
					<CommandGroup heading="Do">
						{onAsk && matches("Ask AI", q) && (
							<CommandItem
								value="act:ask"
								onSelect={() => {
									onOpenChange(false);
									onAsk();
								}}
							>
								<CreativeCommons />
								<span>Ask AI</span>
							</CommandItem>
						)}
						{actions.map((item) => (
							<CommandItem
								key={item.label}
								value={`act:${item.label}`}
								onSelect={() => go(item.to, item.search)}
							>
								<item.icon />
								<span>{item.label}</span>
							</CommandItem>
						))}
					</CommandGroup>
				)}
			</CommandList>

			{/* Only when the vectors were skipped: a short list that looks like
			    the whole answer is worse than a note saying it is not. */}
			{q.length >= 3 && results.data && !results.data.semantic && (
				<CommandFooter>
					<Sparkles className="size-3 text-muted-foreground/50" />
					Text matches only
				</CommandFooter>
			)}
		</CommandDialog>
	);
}

/** Binds cmd+K / ctrl+K. Its own hook so the shell stays markup. */
export function useCommandShortcut(onOpen: () => void) {
	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if (event.key !== "k" || !(event.metaKey || event.ctrlKey)) return;
			// Otherwise the browser's own find-in-page or address bar takes it.
			event.preventDefault();
			onOpen();
		}
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [onOpen]);
}
