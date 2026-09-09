import type { Proposal } from "@/lib/ai-operations";
import type Anthropic from "@anthropic-ai/sdk";

/**
 * What flows between the browser and `/api/ai/chat`.
 *
 * The transcript is the API's own message shape and it lives in the browser,
 * which sends the whole thing with every request: the server keeps nothing
 * between turns. The server streams back what happened as newline-delimited
 * JSON, one event per line, and finishes with the messages it appended so
 * the browser's copy of the transcript stays byte-for-byte what the model
 * saw. Thinking blocks ride along unchanged; the API needs them back on the
 * next request and nothing here reads them.
 */

export type TranscriptMessage = Anthropic.Beta.BetaMessageParam;

export type ChatRequest = {
	messages: TranscriptMessage[];
};

export type ToolSummary = {
	id: string;
	name: string;
	input: Record<string, unknown>;
};

export type ChatEvent =
	| { type: "thinking"; text: string }
	| { type: "text"; text: string }
	| { type: "tool_start"; tool: ToolSummary }
	| {
			type: "tool_result";
			id: string;
			ok: boolean;
			/** A few words for the step row: "14 contacts", "no match". */
			summary: string;
			/** The full result, for when the row is expanded. */
			content: string;
	  }
	| { type: "proposal"; proposal: Proposal }
	/**
	 * A message the server appended to the transcript. The browser replaces
	 * whatever it was drawing from deltas with this, so an interrupted stream
	 * still leaves a transcript the API will accept.
	 */
	| { type: "message"; message: TranscriptMessage }
	| {
			type: "done";
			/**
			 * Why the turn ended. `proposal` means the model is waiting on the
			 * person: the last assistant message holds an unanswered tool call,
			 * and the browser owes the API a `tool_result` for it before the
			 * next request.
			 */
			reason: "end_turn" | "proposal" | "max_rounds" | "refusal" | "aborted";
			/** Any read-tool results that still need to travel with the answer. */
			pendingResults: Anthropic.Beta.BetaToolResultBlockParam[];
	  }
	| { type: "error"; message: string };

export function encodeEvent(event: ChatEvent) {
	return `${JSON.stringify(event)}\n`;
}
