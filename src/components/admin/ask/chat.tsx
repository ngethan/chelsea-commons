import { ProposalCard } from "@/components/admin/ask/proposal-card";
import type {
	ContentBlock,
	ProposalState,
	ToolOutcome,
	useAsk,
} from "@/components/admin/ask/use-ask";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import type { TranscriptMessage } from "@/lib/ai-protocol";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/client";
import {
	ArrowUp,
	BarChart3,
	Building2,
	ChevronRight,
	ClipboardPaste,
	CreativeCommons,
	FileText,
	History,
	KeyRound,
	Plus,
	Search,
	Square,
	Trash2,
	UserRound,
	Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { Streamdown } from "streamdown";

/**
 * The conversation, as a drawer over whatever page you were on.
 *
 * One column, the width of a letter. The person's messages sit to the right
 * in a quiet block; the assistant's answers are plain prose on the left with
 * no bubble, because a bubble around three paragraphs and a table is a
 * frame around a page. Between them, the steps the model took are a short
 * indented list that reads as a receipt: what it looked at, and how much it
 * found. Each opens to the raw result if you want to check its work.
 */

const SUGGESTIONS: Array<{
	label: string;
	prompt: string;
	icon: typeof Users;
}> = [
	{
		label: "How are we doing?",
		prompt:
			"How are we doing? Give me the numbers: pipeline, biggest organizations, and how the last update landed.",
		icon: BarChart3,
	},
	{
		label: "Who opened the last update?",
		prompt:
			"Who opened the most recent update, and who was sent it but has not?",
		icon: FileText,
	},
	{
		label: "Add a pasted list",
		prompt: "Add these people:\n",
		icon: ClipboardPaste,
	},
	{
		label: "Change somebody's status",
		prompt: "Move  to committed",
		icon: UserRound,
	},
	{
		label: "Tag a group",
		prompt: "Tag everyone at  as ",
		icon: Users,
	},
	{
		label: "Find someone",
		prompt: "Who do we know at ",
		icon: Search,
	},
];

/* -------------------------------------------------------------------------- *
 * Prose
 * -------------------------------------------------------------------------- */

const prose = {
	p: ({ children }: { children?: ReactNode }) => (
		<p className="my-2 first:mt-0 last:mb-0">{children}</p>
	),
	ul: ({ children }: { children?: ReactNode }) => (
		<ul className="my-2 list-disc space-y-1 pl-5 first:mt-0 last:mb-0">
			{children}
		</ul>
	),
	ol: ({ children }: { children?: ReactNode }) => (
		<ol className="my-2 list-decimal space-y-1 pl-5 first:mt-0 last:mb-0">
			{children}
		</ol>
	),
	li: ({ children }: { children?: ReactNode }) => (
		<li className="pl-0.5 [&>p]:my-0">{children}</li>
	),
	strong: ({ children }: { children?: ReactNode }) => (
		<strong className="font-medium text-foreground">{children}</strong>
	),
	a: ({ href, children }: { href?: string; children?: ReactNode }) => (
		<a
			href={href}
			className="link-static underline underline-offset-2"
			target={/^https?:\/\//.test(href ?? "") ? "_blank" : undefined}
			rel="noopener noreferrer"
		>
			{children}
		</a>
	),
	h1: ({ children }: { children?: ReactNode }) => (
		<h3 className="mt-4 mb-1.5 text-[13.5px] font-medium first:mt-0">
			{children}
		</h3>
	),
	h2: ({ children }: { children?: ReactNode }) => (
		<h3 className="mt-4 mb-1.5 text-[13.5px] font-medium first:mt-0">
			{children}
		</h3>
	),
	h3: ({ children }: { children?: ReactNode }) => (
		<h3 className="mt-3 mb-1 text-[13px] font-medium first:mt-0">{children}</h3>
	),
	table: ({ children }: { children?: ReactNode }) => (
		<div className="my-3 overflow-x-auto border border-border first:mt-0 last:mb-0">
			<table className="w-full border-separate border-spacing-0 text-[12.5px]">
				{children}
			</table>
		</div>
	),
	thead: ({ children }: { children?: ReactNode }) => <thead>{children}</thead>,
	tbody: ({ children }: { children?: ReactNode }) => <tbody>{children}</tbody>,
	tr: ({ children }: { children?: ReactNode }) => (
		<tr className="group/row">{children}</tr>
	),
	th: ({ children }: { children?: ReactNode }) => (
		<th className="border-b border-border bg-secondary px-2.5 py-1.5 text-left font-medium text-[10.5px] text-muted-foreground uppercase tracking-[0.06em] whitespace-nowrap">
			{children}
		</th>
	),
	td: ({ children }: { children?: ReactNode }) => (
		<td className="border-b border-border px-2.5 py-1.5 align-top group-last/row:border-b-0">
			{children}
		</td>
	),
	code: ({
		className,
		children,
	}: {
		className?: string;
		children?: ReactNode;
	}) =>
		className?.includes("language-") ? (
			<code className="font-mono text-[12px]">{children}</code>
		) : (
			<code className="bg-secondary px-1 py-0.5 font-mono text-[12px]">
				{children}
			</code>
		),
	pre: ({ children }: { children?: ReactNode }) => (
		<pre className="my-2 overflow-x-auto border border-border bg-card p-3">
			{children}
		</pre>
	),
	hr: () => <hr className="my-3 border-border" />,
	blockquote: ({ children }: { children?: ReactNode }) => (
		<blockquote className="my-2 border-l-2 border-border pl-3 text-muted-foreground">
			{children}
		</blockquote>
	),
};

function Prose({ text, streaming }: { text: string; streaming: boolean }) {
	return (
		<div
			className={cn(
				"ask-prose text-[13.5px] leading-[1.6] text-foreground",
				streaming && "ask-streaming",
			)}
		>
			<Streamdown components={prose}>{text}</Streamdown>
		</div>
	);
}

/* -------------------------------------------------------------------------- *
 * Steps
 * -------------------------------------------------------------------------- */

const STEP_ICON: Record<string, typeof Users> = {
	get_stats: BarChart3,
	list_contacts: Users,
	get_contact: UserRound,
	list_organizations: Building2,
	get_organization: Building2,
	list_updates: FileText,
	get_update: FileText,
	list_posts: FileText,
	list_access: KeyRound,
	search_records: Search,
	parse_contact_list: ClipboardPaste,
	propose_changes: CreativeCommons,
};

/** What the row says. Past tense: by the time you read it, it has happened. */
function describeStep(name: string, input: Record<string, unknown>) {
	const q = (key: string) =>
		typeof input[key] === "string" && (input[key] as string).trim()
			? (input[key] as string).trim()
			: null;
	switch (name) {
		case "get_stats":
			return "Gathered the numbers";
		case "list_contacts": {
			const parts = [
				q("status"),
				q("tag") && `tag ${q("tag")}`,
				q("organization"),
				q("query") && `"${q("query")}"`,
			]
				.filter(Boolean)
				.join(", ");
			return parts ? `Listed contacts: ${parts}` : "Listed contacts";
		}
		case "get_contact":
			return `Looked up ${q("email") ?? "a contact"}`;
		case "list_organizations":
			return q("query")
				? `Listed organizations: "${q("query")}"`
				: "Listed organizations";
		case "get_organization":
			return `Looked up ${q("name") ?? "an organization"}`;
		case "list_updates":
			return "Listed updates";
		case "get_update":
			return "Opened an update";
		case "list_posts":
			return "Listed posts";
		case "list_access":
			return "Listed who can sign in";
		case "search_records":
			return `Searched "${q("query") ?? ""}"`;
		case "parse_contact_list":
			return "Read the pasted list";
		case "propose_changes":
			return "Drafted changes";
		default:
			return name;
	}
}

function pretty(content: string) {
	try {
		return JSON.stringify(JSON.parse(content), null, 2);
	} catch {
		return content;
	}
}

function Step({
	block,
	outcome,
}: {
	block: Extract<ContentBlock, { type: "tool_use" }>;
	outcome: ToolOutcome | undefined;
}) {
	const [open, setOpen] = useState(false);
	const Icon = STEP_ICON[block.name] ?? Search;
	const input = (block.input ?? {}) as Record<string, unknown>;

	return (
		<motion.li
			initial={{ opacity: 0, y: 3 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.15 }}
		>
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				aria-expanded={open}
				className="group/step flex w-full cursor-pointer items-center gap-2 py-1 text-left text-[12.5px] text-muted-foreground hover:text-foreground"
			>
				<Icon className="size-3.5 shrink-0" />
				<span className="min-w-0 truncate">
					{describeStep(block.name, input)}
				</span>
				{outcome ? (
					<span
						className={cn(
							"ml-auto shrink-0 font-mono text-[11px]",
							outcome.ok ? "text-muted-foreground/80" : "text-destructive",
						)}
					>
						{outcome.summary}
					</span>
				) : (
					<span className="ml-auto flex shrink-0 items-center gap-1">
						<span className="size-1.5 animate-pulse rounded-full bg-primary" />
					</span>
				)}
				<ChevronRight
					className={cn(
						"size-3 shrink-0 text-muted-foreground/50 transition-transform",
						open && "rotate-90",
					)}
				/>
			</button>
			<AnimatePresence initial={false}>
				{open && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.15 }}
						className="overflow-hidden"
					>
						<pre className="my-1 max-h-72 overflow-auto border border-border bg-card p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
							{Object.keys(input).length > 0 && (
								<>
									<span className="text-foreground/70">{"// asked"}</span>
									{"\n"}
									{JSON.stringify(input, null, 2)}
									{"\n\n"}
								</>
							)}
							<span className="text-foreground/70">{"// got"}</span>
							{"\n"}
							{outcome ? pretty(outcome.content) : "…"}
						</pre>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.li>
	);
}

/* -------------------------------------------------------------------------- *
 * Messages
 * -------------------------------------------------------------------------- */

function Thinking({ text, live }: { text: string; live: boolean }) {
	const [open, setOpen] = useState(false);
	if (!text.trim()) return null;
	if (live) {
		return (
			<div className="my-2 text-[12.5px] leading-relaxed text-muted-foreground/70">
				<span className="ask-shimmer">Thinking</span>
				<span className="ml-2 line-clamp-2">{text.trim()}</span>
			</div>
		);
	}
	return (
		<div className="my-1">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="flex cursor-pointer items-center gap-1 text-[11.5px] text-muted-foreground/70 hover:text-foreground"
			>
				<ChevronRight
					className={cn("size-3 transition-transform", open && "rotate-90")}
				/>
				Reasoning
			</button>
			{open && (
				<p className="mt-1 whitespace-pre-wrap border-l border-border pl-3 text-[12.5px] leading-relaxed text-muted-foreground">
					{text.trim()}
				</p>
			)}
		</div>
	);
}

/** Consecutive tool calls share one indented list, so a five-step lookup is one receipt. */
function group(blocks: ContentBlock[]) {
	const out: Array<ContentBlock | ContentBlock[]> = [];
	for (const block of blocks) {
		const last = out[out.length - 1];
		const isTool = block.type === "tool_use";
		if (isTool && Array.isArray(last)) last.push(block);
		else out.push(isTool ? [block] : block);
	}
	return out;
}

function AssistantMessage({
	blocks,
	outcomes,
	proposals,
	streaming,
	onDecide,
}: {
	blocks: ContentBlock[];
	outcomes: Record<string, ToolOutcome>;
	proposals: Record<string, ProposalState>;
	streaming: boolean;
	onDecide: (id: string, decision: "apply" | "discard") => void;
}) {
	const grouped = group(blocks);
	return (
		<div className="flex flex-col">
			{grouped.map((item, index) => {
				const last = index === grouped.length - 1;
				if (Array.isArray(item)) {
					const cards = item.filter(
						(b) => b.type === "tool_use" && proposals[b.id],
					) as Array<Extract<ContentBlock, { type: "tool_use" }>>;
					const steps = item.filter(
						(b) => b.type === "tool_use" && !proposals[b.id],
					) as Array<Extract<ContentBlock, { type: "tool_use" }>>;
					return (
						<div key={`g${index}`}>
							{steps.length > 0 && (
								<ul className="my-2 flex flex-col border-l border-border pl-3">
									{steps.map((b) => (
										<Step key={b.id} block={b} outcome={outcomes[b.id]} />
									))}
								</ul>
							)}
							{cards.map((b) => (
								<ProposalCard
									key={b.id}
									entry={proposals[b.id]}
									onDecide={(decision) => onDecide(b.id, decision)}
								/>
							))}
						</div>
					);
				}
				if (item.type === "thinking") {
					return (
						<Thinking
							key={`t${index}`}
							text={item.thinking}
							live={streaming && last}
						/>
					);
				}
				if (item.type === "text") {
					return (
						<Prose
							key={`p${index}`}
							text={item.text}
							streaming={streaming && last}
						/>
					);
				}
				return null;
			})}
		</div>
	);
}

function UserMessage({ text }: { text: string }) {
	return (
		<div className="flex justify-end">
			<div className="max-w-[85%] whitespace-pre-wrap bg-secondary px-3.5 py-2 text-[13.5px] leading-[1.55]">
				{text}
			</div>
		</div>
	);
}

function userTexts(message: TranscriptMessage) {
	if (typeof message.content === "string") return [message.content];
	return message.content
		.filter((b) => b.type === "text")
		.map((b) => (b as { text: string }).text);
}

/* -------------------------------------------------------------------------- *
 * Composer
 * -------------------------------------------------------------------------- */

function Composer({
	value,
	onChange,
	onSend,
	onStop,
	streaming,
	inputRef,
}: {
	value: string;
	onChange: (value: string) => void;
	onSend: () => void;
	onStop: () => void;
	streaming: boolean;
	inputRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
	// Grows with the text up to about nine lines, then scrolls. A paste of
	// forty addresses should be visible, not a one-line slot you scroll in.
	// biome-ignore lint/correctness/useExhaustiveDependencies: the height is a function of the text, which is `value`; the effect reads it off the DOM rather than the prop.
	useLayoutEffect(() => {
		const el = inputRef.current;
		if (!el) return;
		el.style.height = "0px";
		el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
	}, [value, inputRef]);

	const canSend = value.trim().length > 0 && !streaming;

	return (
		<div className="shrink-0 border-t border-border">
			<form
				className="flex w-full items-end gap-2 px-8 py-5"
				onSubmit={(e) => {
					e.preventDefault();
					if (canSend) onSend();
				}}
			>
				<div className="flex min-w-0 flex-1 items-end border border-input bg-card transition-colors focus-within:border-input-focus">
					<textarea
						ref={inputRef}
						value={value}
						rows={1}
						onChange={(e) => onChange(e.target.value)}
						onKeyDown={(e) => {
							if (
								e.key === "Enter" &&
								!e.shiftKey &&
								!e.nativeEvent.isComposing
							) {
								e.preventDefault();
								if (canSend) onSend();
							}
						}}
						placeholder="Ask about the list, or say what to change"
						className="max-h-[220px] min-h-[38px] w-full resize-none bg-transparent px-3 py-2 text-[13.5px] leading-[1.55] text-foreground outline-none placeholder:text-muted-foreground/70"
					/>
					{streaming ? (
						<Button
							type="button"
							variant="foreground"
							size="icon-sm"
							className="m-1 shrink-0"
							onClick={onStop}
							aria-label="Stop"
						>
							<Square className="size-3 fill-current" />
						</Button>
					) : (
						<Button
							type="submit"
							size="icon-sm"
							className="m-1 shrink-0"
							disabled={!canSend}
							aria-label="Send"
						>
							<ArrowUp className="size-4" strokeWidth={2.25} />
						</Button>
					)}
				</div>
			</form>
		</div>
	);
}

/* -------------------------------------------------------------------------- *
 * History
 * -------------------------------------------------------------------------- */

/** "2m", "3h", "4d", then a date. Short, because the column is narrow. */
function ago(value: Date | string) {
	const ms = Date.now() - new Date(value).getTime();
	const minutes = Math.round(ms / 60_000);
	if (minutes < 1) return "now";
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `${hours}h`;
	const days = Math.round(hours / 24);
	if (days < 14) return `${days}d`;
	return new Date(value).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
}

function HistoryPanel({
	currentId,
	onOpen,
	onRemove,
}: {
	currentId: string | null;
	onOpen: (id: string) => void;
	onRemove: (id: string) => void;
}) {
	const list = trpc.ai.conversations.useQuery();
	const [removing, setRemoving] = useState<string | null>(null);
	const rows = list.data ?? [];

	return (
		<div className="min-h-0 flex-1 overflow-y-auto">
			{!list.isLoading && rows.length === 0 && (
				<div className="px-8 py-10 text-center text-[12.5px] text-muted-foreground">
					Nothing yet.
				</div>
			)}
			<ul className="divide-y divide-border">
				{rows.map((row) => {
					const current = row.id === currentId;
					return (
						<li
							key={row.id}
							className={cn(
								"group/row relative flex items-center",
								current && "bg-secondary",
							)}
						>
							<button
								type="button"
								onClick={() => onOpen(row.id)}
								className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 px-8 py-3 text-left transition-colors hover:bg-hover-muted"
							>
								<span className="min-w-0 flex-1 truncate text-[13px]">
									{row.title}
								</span>
								<span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
									{Math.floor(row.messages / 2)}
									<span className="text-muted-foreground/50"> · </span>
									{ago(row.updatedAt)}
								</span>
							</button>
							<Button
								variant="icon"
								size="icon-xs"
								aria-label="Delete"
								onClick={() => setRemoving(row.id)}
								className="absolute right-3 opacity-0 transition-opacity focus-visible:opacity-100 group-hover/row:opacity-100"
							>
								<Trash2 />
							</Button>
						</li>
					);
				})}
			</ul>
			<ConfirmDialog
				open={removing !== null}
				onOpenChange={(open) => !open && setRemoving(null)}
				title="Delete this conversation?"
				description="Anything it applied stays applied; only the record of the exchange goes."
				action="Delete"
				onConfirm={() => {
					if (removing) onRemove(removing);
					setRemoving(null);
				}}
			/>
		</div>
	);
}

/* -------------------------------------------------------------------------- *
 * The drawer
 * -------------------------------------------------------------------------- */

/** cmd+J / ctrl+J opens it from anywhere in the admin. */
export function useAskShortcut(onOpen: () => void) {
	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if (event.key !== "j" || !(event.metaKey || event.ctrlKey)) return;
			event.preventDefault();
			onOpen();
		}
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [onOpen]);
}

/**
 * The state comes from the shell, not from in here: the sheet unmounts its
 * contents when it closes, and a turn that is half way through a lookup
 * should not die because somebody closed the drawer to check the table.
 */
export function AskDrawer({
	open,
	onOpenChange,
	ask,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	ask: ReturnType<typeof useAsk>;
}) {
	const { state, conversationId, send, decide, stop, reset, load, remove } =
		ask;
	const status = trpc.ai.status.useQuery(undefined, { enabled: open });
	const [value, setValue] = useState("");
	const [view, setView] = useState<"chat" | "history">("chat");

	// The list is a detour; closing the drawer ends it.
	useEffect(() => {
		if (!open) setView("chat");
	}, [open]);
	const inputRef = useRef<HTMLTextAreaElement | null>(null);
	const scrollRef = useRef<HTMLDivElement | null>(null);
	const stuckRef = useRef(true);

	// Follows the stream only while the reader is at the bottom. Scrolling up
	// to re-read something is a choice, and a panel that yanks you back down
	// on every token overrides it.
	const onScroll = useCallback(() => {
		const el = scrollRef.current;
		if (!el) return;
		stuckRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
	}, []);

	useEffect(() => {
		const el = scrollRef.current;
		if (el && stuckRef.current) el.scrollTop = el.scrollHeight;
	});

	const submit = () => {
		send(value);
		setValue("");
		stuckRef.current = true;
	};

	const fill = (prompt: string) => {
		setValue(prompt);
		requestAnimationFrame(() => {
			const el = inputRef.current;
			if (!el) return;
			el.focus();
			// Templates carry a gap to fill; put the caret in it.
			const gap = prompt.indexOf("  ");
			const at = gap >= 0 ? gap + 1 : prompt.length;
			el.setSelectionRange(at, at);
		});
	};

	const empty = state.transcript.length === 0 && !state.streaming;
	const off = status.data && !status.data.configured;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				className="max-w-[760px]"
				aria-describedby={undefined}
				onOpenAutoFocus={(event) => {
					// Straight into the field, not onto the close button.
					event.preventDefault();
					inputRef.current?.focus();
				}}
			>
				{/* The same header every drawer has. "New" sits beside the close
				    button, which the sheet places itself, so the two read as one
				    pair of controls rather than a title with things stuck to it. */}
				<SheetHeader>
					<SheetTitle>{view === "history" ? "History" : "Ask AI"}</SheetTitle>
					<div className="absolute top-6 right-16 flex items-center gap-1">
						{(state.transcript.length > 0 || view === "history") && (
							<Button
								size="sm"
								variant="text"
								onClick={() => {
									reset();
									setView("chat");
								}}
							>
								<Plus data-icon="inline-start" />
								New
							</Button>
						)}
						<Button
							variant="icon"
							size="icon-sm"
							aria-label="History"
							aria-pressed={view === "history"}
							onClick={() =>
								setView((v) => (v === "history" ? "chat" : "history"))
							}
							className="aria-pressed:bg-hover-muted aria-pressed:text-foreground"
						>
							<History />
						</Button>
					</div>
				</SheetHeader>

				{view === "history" && (
					<HistoryPanel
						currentId={conversationId}
						onOpen={(id) => {
							void load(id);
							setView("chat");
						}}
						onRemove={(id) => void remove(id)}
					/>
				)}

				{view === "chat" && (
					<div
						ref={scrollRef}
						onScroll={onScroll}
						className="min-h-0 flex-1 overflow-y-auto"
					>
						<div className="flex w-full flex-col gap-5 px-8 py-8">
							{empty && (
								<div className="flex min-h-[40vh] flex-col justify-end gap-6">
									<div>
										<h2 className="text-[17px] font-medium tracking-[-0.01em]">
											{off
												? "The assistant is off."
												: "What do you want to know, or change?"}
										</h2>
										{off && (
											<p className="mt-1 text-[12.5px] text-muted-foreground">
												ANTHROPIC_API_KEY is not set.
											</p>
										)}
									</div>
									{!off && (
										<ul className="grid gap-px border border-border bg-border sm:grid-cols-2">
											{SUGGESTIONS.map((s) => (
												<li
													key={s.label}
													className="bg-background dark:bg-[oklch(0.235_0_0)]"
												>
													<button
														type="button"
														onClick={() => fill(s.prompt)}
														className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left text-[13px] text-muted-foreground transition-colors hover:bg-hover-muted hover:text-foreground"
													>
														<s.icon className="size-4 shrink-0" />
														{s.label}
													</button>
												</li>
											))}
										</ul>
									)}
								</div>
							)}

							{state.transcript.map((message, index) => {
								if (message.role === "user") {
									return userTexts(message).map((text, i) => (
										<UserMessage key={`u${index}.${i}`} text={text} />
									));
								}
								const blocks = (
									typeof message.content === "string"
										? [{ type: "text", text: message.content }]
										: message.content
								) as ContentBlock[];
								return (
									<AssistantMessage
										key={`a${index}`}
										blocks={blocks}
										outcomes={state.outcomes}
										proposals={state.proposals}
										streaming={false}
										onDecide={decide}
									/>
								);
							})}

							{state.streaming && state.draft && state.draft.length > 0 && (
								<AssistantMessage
									blocks={state.draft}
									outcomes={state.outcomes}
									proposals={state.proposals}
									streaming
									onDecide={decide}
								/>
							)}

							{state.streaming &&
								(!state.draft || state.draft.length === 0) && (
									<div className="flex items-center gap-1.5 py-1 text-[12.5px] text-muted-foreground">
										<span className="ask-shimmer">Thinking</span>
									</div>
								)}

							{state.error && (
								<div className="border border-destructive/30 bg-destructive/8 px-3.5 py-2.5 text-[12.5px] text-destructive">
									{state.error}
								</div>
							)}
						</div>
					</div>
				)}

				{view === "chat" && (
					<Composer
						value={value}
						onChange={setValue}
						onSend={submit}
						onStop={stop}
						streaming={state.streaming}
						inputRef={inputRef}
					/>
				)}
			</SheetContent>
		</Sheet>
	);
}
