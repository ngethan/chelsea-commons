import type { ApplyResult, Proposal } from "@/lib/ai-operations";
import type { ChatEvent, TranscriptMessage } from "@/lib/ai-protocol";
import { toast } from "@/lib/toast";
import { trpc } from "@/trpc/client";
import type Anthropic from "@anthropic-ai/sdk";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

/**
 * The conversation, held in the browser.
 *
 * The server keeps nothing between turns, so the browser owns the transcript
 * in the API's own shape and posts the whole of it each time. Alongside it
 * sit the things the model's messages point at but do not contain: what
 * each tool call came back with (for the step rows), and each proposal with
 * what the person did about it. All of it is saved to the server as one
 * document a moment after it changes, so a conversation can be reopened
 * later from any browser; the id of the one you were in is kept in
 * localStorage so a reload lands back in it.
 *
 * `draft` is the assistant message being streamed right now, in the same
 * block shape as a finished one, so the renderer does not know the
 * difference. When the server sends the finished message the draft is
 * dropped and the message takes its place.
 */

export type ContentBlock = Anthropic.Beta.BetaContentBlockParam;

export type ToolOutcome = { ok: boolean; summary: string; content: string };

export type ProposalState = {
	proposal: Proposal;
	status: "pending" | "applying" | "applied" | "discarded" | "skipped";
	result?: ApplyResult;
};

/** A proposal the model is waiting on, and the read results that go back with the answer. */
type Pending = {
	proposalId: string;
	pendingResults: Anthropic.Beta.BetaToolResultBlockParam[];
};

export type AskState = {
	transcript: TranscriptMessage[];
	outcomes: Record<string, ToolOutcome>;
	proposals: Record<string, ProposalState>;
	pending: Pending | null;
	draft: ContentBlock[] | null;
	streaming: boolean;
	error: string | null;
};

const EMPTY: AskState = {
	transcript: [],
	outcomes: {},
	proposals: {},
	pending: null,
	draft: null,
	streaming: false,
	error: null,
};

type Action =
	| { type: "hydrate"; state: Partial<AskState> }
	| { type: "reset" }
	| { type: "transcript"; transcript: TranscriptMessage[] }
	| { type: "start" }
	| { type: "event"; event: ChatEvent }
	| { type: "finish" }
	| { type: "proposal"; id: string; patch: Partial<ProposalState> }
	| { type: "pending"; pending: Pending | null }
	| { type: "error"; message: string | null };

function appendDelta(
	draft: ContentBlock[],
	kind: "text" | "thinking",
	text: string,
): ContentBlock[] {
	const last = draft[draft.length - 1];
	if (last && last.type === kind) {
		const merged =
			kind === "text"
				? { ...last, text: (last as { text: string }).text + text }
				: {
						...last,
						thinking: (last as { thinking: string }).thinking + text,
					};
		return [...draft.slice(0, -1), merged as ContentBlock];
	}
	const block: ContentBlock =
		kind === "text"
			? { type: "text", text }
			: { type: "thinking", thinking: text, signature: "" };
	return [...draft, block];
}

function reduce(state: AskState, action: Action): AskState {
	switch (action.type) {
		case "hydrate":
			return { ...state, ...action.state, draft: null, streaming: false };
		case "reset":
			return EMPTY;
		case "transcript":
			return { ...state, transcript: action.transcript };
		case "start":
			return { ...state, draft: [], streaming: true, error: null };
		case "finish": {
			// A card that arrived without its `done` (the stream was stopped in
			// between) can never be answered, so it is closed here rather than
			// left with live buttons.
			const proposals = { ...state.proposals };
			for (const [id, entry] of Object.entries(proposals)) {
				if (entry.status === "pending" && state.pending?.proposalId !== id)
					proposals[id] = { ...entry, status: "skipped" };
			}
			return { ...state, draft: null, streaming: false, proposals };
		}
		case "proposal": {
			const current = state.proposals[action.id];
			if (!current) return state;
			return {
				...state,
				proposals: {
					...state.proposals,
					[action.id]: { ...current, ...action.patch },
				},
			};
		}
		case "pending":
			return { ...state, pending: action.pending };
		case "error":
			return { ...state, error: action.message };
		case "event": {
			const event = action.event;
			const draft = state.draft ?? [];
			switch (event.type) {
				case "text":
					return { ...state, draft: appendDelta(draft, "text", event.text) };
				case "thinking":
					return {
						...state,
						draft: appendDelta(draft, "thinking", event.text),
					};
				case "tool_start":
					return {
						...state,
						draft: [
							...draft,
							{
								type: "tool_use",
								id: event.tool.id,
								name: event.tool.name,
								input: event.tool.input,
							},
						],
					};
				case "tool_result":
					return {
						...state,
						outcomes: {
							...state.outcomes,
							[event.id]: {
								ok: event.ok,
								summary: event.summary,
								content: event.content,
							},
						},
					};
				case "proposal":
					return {
						...state,
						proposals: {
							...state.proposals,
							[event.proposal.id]: {
								proposal: event.proposal,
								status: "pending",
							},
						},
					};
				case "message":
					return {
						...state,
						transcript: [...state.transcript, event.message],
						// The finished assistant message replaces the draft; a tool
						// results message leaves the (empty) draft ready for the next.
						draft: event.message.role === "assistant" ? [] : state.draft,
					};
				case "done": {
					if (event.reason !== "proposal") return state;
					const proposalId = Object.values(state.proposals).find(
						(p) => p.status === "pending",
					)?.proposal.id;
					return {
						...state,
						pending: proposalId
							? { proposalId, pendingResults: event.pendingResults }
							: null,
					};
				}
				case "error":
					return { ...state, error: event.message };
			}
		}
	}
	return state;
}

/** Which conversation this browser was last in. The conversation itself is on the server. */
const CURRENT_KEY = "ask-ai:conversation";

type Persisted = Pick<
	AskState,
	"transcript" | "outcomes" | "proposals" | "pending"
>;

function persisted(state: AskState): Persisted {
	const { transcript, outcomes, proposals, pending } = state;
	return { transcript, outcomes, proposals, pending };
}

/** The first thing the person said, cut to a line. */
function titleFor(transcript: TranscriptMessage[]) {
	for (const message of transcript) {
		if (message.role !== "user") continue;
		const text =
			typeof message.content === "string"
				? message.content
				: message.content
						.filter((b) => b.type === "text")
						.map((b) => (b as { text: string }).text)
						.join(" ");
		const line = text.trim().split("\n")[0]?.trim();
		if (line) return line.length > 80 ? `${line.slice(0, 79)}…` : line;
	}
	return "Conversation";
}

function readCurrent() {
	try {
		return localStorage.getItem(CURRENT_KEY);
	} catch {
		return null;
	}
}

function writeCurrent(id: string | null) {
	try {
		if (id) localStorage.setItem(CURRENT_KEY, id);
		else localStorage.removeItem(CURRENT_KEY);
	} catch {
		// Without it a reload starts fresh; the conversation is still saved.
	}
}

/**
 * Tool calls the last assistant message made that never got an answer, which
 * happens when a turn is stopped mid-way. The API refuses a transcript that
 * leaves one open, so each gets a result saying what happened.
 */
function unanswered(
	transcript: TranscriptMessage[],
): Anthropic.Beta.BetaToolResultBlockParam[] {
	const last = transcript[transcript.length - 1];
	if (last?.role !== "assistant" || !Array.isArray(last.content)) return [];
	return last.content
		.filter((block) => block.type === "tool_use")
		.map((block) => ({
			type: "tool_result" as const,
			tool_use_id: (block as { id: string }).id,
			content: "Stopped by the person before this finished.",
		}));
}

/** Two user messages in a row become one, which is what the API prefers. */
function appendUser(
	transcript: TranscriptMessage[],
	content: ContentBlock[],
): TranscriptMessage[] {
	const last = transcript[transcript.length - 1];
	if (last?.role === "user" && Array.isArray(last.content)) {
		return [
			...transcript.slice(0, -1),
			{ role: "user", content: [...last.content, ...content] },
		];
	}
	return [...transcript, { role: "user", content }];
}

export function useAsk() {
	const [state, dispatch] = useReducer(reduce, EMPTY);
	const stateRef = useRef(state);
	stateRef.current = state;
	const abortRef = useRef<AbortController | null>(null);
	const hydratedRef = useRef(false);
	/** What the server last received, so an unchanged state is not re-sent. */
	const savedRef = useRef("");
	const idRef = useRef<string | null>(null);
	const [conversationId, setConversationId] = useState<string | null>(null);
	const utils = trpc.useUtils();
	const apply = trpc.ai.applyProposal.useMutation();

	const adopt = useCallback((id: string | null) => {
		idRef.current = id;
		setConversationId(id);
		writeCurrent(id);
	}, []);

	// Pick up where this browser left off. Runs once, after mount, because
	// localStorage does not exist during SSR; saving is held until it has.
	useEffect(() => {
		let cancelled = false;
		(async () => {
			const id = readCurrent();
			if (id) {
				try {
					const row = await utils.client.ai.conversation.query({ id });
					if (cancelled) return;
					const state = row.state as Persisted;
					savedRef.current = JSON.stringify(state);
					dispatch({ type: "hydrate", state });
					adopt(id);
				} catch {
					// Deleted elsewhere, or somebody else's. Start clean.
					writeCurrent(null);
				}
			}
			hydratedRef.current = true;
		})();
		return () => {
			cancelled = true;
		};
	}, [utils, adopt]);

	// Saved a moment after it settles, never mid-stream: the finished message
	// arrives as one event and is what the server should hold, not a draft.
	useEffect(() => {
		if (!hydratedRef.current || state.streaming) return;
		if (state.transcript.length === 0) return;
		const snapshot = persisted(state);
		const encoded = JSON.stringify(snapshot);
		if (encoded === savedRef.current) return;

		const handle = setTimeout(async () => {
			try {
				const row = await utils.client.ai.saveConversation.mutate({
					id: idRef.current ?? undefined,
					title: titleFor(snapshot.transcript),
					state: snapshot,
				});
				savedRef.current = encoded;
				if (row.id !== idRef.current) adopt(row.id);
				void utils.ai.conversations.invalidate();
			} catch (err) {
				console.error("[ask] save failed", err);
			}
		}, 600);
		return () => clearTimeout(handle);
	}, [state, utils, adopt]);

	useEffect(() => () => abortRef.current?.abort(), []);

	const run = useCallback(async (transcript: TranscriptMessage[]) => {
		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;
		dispatch({ type: "start" });

		try {
			const response = await fetch("/api/ai/chat", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ messages: transcript }),
				signal: controller.signal,
			});

			if (!response.ok || !response.body) {
				const body = await response.json().catch(() => null);
				dispatch({
					type: "error",
					message:
						(body as { error?: string } | null)?.error ??
						(response.status === 401
							? "Sign in again, your session expired."
							: "The assistant did not answer."),
				});
				return;
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = "";
			for (;;) {
				const { value, done } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });
				let newline = buffer.indexOf("\n");
				while (newline !== -1) {
					const line = buffer.slice(0, newline);
					buffer = buffer.slice(newline + 1);
					if (line.trim()) {
						dispatch({ type: "event", event: JSON.parse(line) as ChatEvent });
					}
					newline = buffer.indexOf("\n");
				}
			}
		} catch (err) {
			if (!controller.signal.aborted) {
				dispatch({ type: "error", message: "Lost the connection." });
				console.error("[ask]", err);
			}
		} finally {
			if (abortRef.current === controller) abortRef.current = null;
			dispatch({ type: "finish" });
		}
	}, []);

	/**
	 * Answers a proposal's tool call. `pending` holds the read results that
	 * were executed in the same round; they travel in the same user message,
	 * which is the only shape the API accepts.
	 */
	const resolvePending = useCallback((content: string): TranscriptMessage[] => {
		const { transcript, pending } = stateRef.current;
		if (!pending) return transcript;
		dispatch({ type: "pending", pending: null });
		return appendUser(transcript, [
			...pending.pendingResults,
			{ type: "tool_result", tool_use_id: pending.proposalId, content },
		]);
	}, []);

	const send = useCallback(
		(text: string) => {
			const trimmed = text.trim();
			if (!trimmed || stateRef.current.streaming) return;

			let transcript = stateRef.current.transcript;
			const { pending } = stateRef.current;
			if (pending) {
				// Typing past a card is a decision too.
				dispatch({
					type: "proposal",
					id: pending.proposalId,
					patch: { status: "skipped" },
				});
				transcript = resolvePending(
					"The person moved on without applying this. Treat it as declined.",
				);
			}

			const next = appendUser(transcript, [
				...unanswered(transcript),
				{ type: "text", text: trimmed },
			]);
			dispatch({ type: "transcript", transcript: next });
			void run(next);
		},
		[resolvePending, run],
	);

	const decide = useCallback(
		async (id: string, decision: "apply" | "discard") => {
			const entry = stateRef.current.proposals[id];
			const { pending } = stateRef.current;
			if (!entry || entry.status !== "pending" || pending?.proposalId !== id)
				return;

			if (decision === "discard") {
				dispatch({ type: "proposal", id, patch: { status: "discarded" } });
				const next = resolvePending(
					"The person declined this proposal. Do not retry it unless asked.",
				);
				dispatch({ type: "transcript", transcript: next });
				return;
			}

			dispatch({ type: "proposal", id, patch: { status: "applying" } });
			let result: ApplyResult;
			try {
				result = await apply.mutateAsync({
					operations: entry.proposal.operations.map((o) => o.operation),
				});
			} catch (err) {
				dispatch({ type: "proposal", id, patch: { status: "pending" } });
				toast.error(err instanceof Error ? err.message : "Could not apply.");
				return;
			}

			dispatch({ type: "proposal", id, patch: { status: "applied", result } });
			void utils.invalidate();
			if (result.failed === 0) {
				toast.success(
					result.applied === 1 ? "Applied." : `${result.applied} applied.`,
				);
			} else {
				toast.warning(`${result.applied} applied, ${result.failed} failed.`);
			}

			const next = resolvePending(
				JSON.stringify({
					decision: "applied",
					applied: result.applied,
					failed: result.failed,
					results: result.results,
				}),
			);
			dispatch({ type: "transcript", transcript: next });
			void run(next);
		},
		[apply, resolvePending, run, utils],
	);

	const stop = useCallback(() => {
		abortRef.current?.abort();
	}, []);

	/** A blank conversation. The old one stays saved and listed. */
	const reset = useCallback(() => {
		abortRef.current?.abort();
		dispatch({ type: "reset" });
		savedRef.current = "";
		adopt(null);
	}, [adopt]);

	/** Reopens a saved conversation, including any card still waiting. */
	const load = useCallback(
		async (id: string) => {
			if (id === idRef.current) return;
			abortRef.current?.abort();
			try {
				const row = await utils.client.ai.conversation.query({ id });
				const state = row.state as Persisted;
				savedRef.current = JSON.stringify(state);
				dispatch({ type: "reset" });
				dispatch({ type: "hydrate", state });
				adopt(id);
			} catch (err) {
				toast.error(err instanceof Error ? err.message : "Could not open it.");
			}
		},
		[utils, adopt],
	);

	const remove = useCallback(
		async (id: string) => {
			try {
				await utils.client.ai.removeConversation.mutate({ id });
			} catch (err) {
				toast.error(
					err instanceof Error ? err.message : "Could not delete it.",
				);
				return;
			}
			void utils.ai.conversations.invalidate();
			if (id === idRef.current) reset();
		},
		[utils, reset],
	);

	return { state, conversationId, send, decide, stop, reset, load, remove };
}
