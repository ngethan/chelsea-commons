import { proposalInputSchema } from "@/lib/ai-operations";
import type { ChatEvent, TranscriptMessage } from "@/lib/ai-protocol";
import { CONTACT_STATUSES } from "@/lib/status";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { validateProposal } from "./proposal";
import { READ_TOOLS, type ToolContext } from "./read-tools";

/**
 * One turn of the conversation, as a stream of events.
 *
 * The loop is the ordinary one: ask the model, run whatever tools it called,
 * hand the results back, repeat until it answers in words. Two things are
 * particular to this admin.
 *
 * Reads run at once. `propose_changes` does not: a valid proposal is sent to
 * the browser as a card and the turn ends there, with the tool call left
 * unanswered. The browser owes the API a `tool_result` for it, and supplies
 * one only after the person has pressed Apply or Discard, so the model finds
 * out what happened the same way the person decided it. An invalid proposal
 * (an id that is nobody, an address already on the list) goes straight back
 * to the model as an error, so the person is never shown a card that cannot
 * be applied.
 */

export const MODEL = "claude-opus-5";
const MAX_ROUNDS = 12;
const MAX_TOKENS = 16_000;
/** A tool result longer than this is cut, with a note saying so. */
const RESULT_CAP = 60_000;

const PROPOSE = "propose_changes";

const SYSTEM = `You are the assistant inside the Chelsea Commons admin: a small, private list of the people a fund and a house in Chelsea talk to. It holds contacts, the organizations they belong to, the investor updates that have gone out as tracked links, and who can sign in.

How to work
- Look before you speak. Every fact about the list comes from a tool. Never guess a name, a number or an id; ids exist only in tool results.
- Reads cost nothing to the person. Call them freely, and in parallel when they do not depend on each other. Start broad questions with get_stats.
- Changes go through ${PROPOSE} and only through it. It shows the person a card, and nothing happens until they press Apply. Put everything one request implies into a single ${PROPOSE} call per turn, and make the summary one plain sentence.
- Resolve before you propose: parse_contact_list for a pasted block; list_contacts or get_contact to find who is meant; list_posts before create_update. Somebody already on the list is not created again; they are updated only if the person asked for that.
- When it is unclear who or what is meant, ask one short question instead of proposing.
- After proposing, stop and wait. The tool result says whether it was applied, and what happened to each row, or that it was declined. Do not repeat a declined proposal unless asked.
- Status is pipeline position only: ${CONTACT_STATUSES.join(", ")}. What somebody is (advisor, LP, host, friend) is a tag. Their role at work ("Principal", "Founder") is title; the company is organization.
- pocs is who in the house holds the relationship, by first name; several is fine.
- Things that happened with somebody ("shared the update, asked about a venue", "had a call") are logged with log_interaction, one per touchpoint, dated. Standing context about who they are goes in notes.
- A contact needs a name or an email, not both. Addresses identify people when there is one; match them case-insensitively. Without one, check list_contacts for the same name before adding.
- A pasted spreadsheet may have one row for several people ("Ami + Bobby" with two addresses): that is one contact per person. Rows repeated across columns are a copy artifact: read them once.

How to write
- Plain and short. Answer first, detail after. No preamble, no em dashes, no sales tone.
- A markdown table for more than three rows being compared; otherwise a sentence or a short list. Name people, do not paste raw JSON or ids.
- Never write the house's street address.`;

function toolParams(): Anthropic.Beta.BetaToolUnion[] {
	const toInputSchema = (schema: z.ZodObject) => {
		const { $schema: _drop, ...json } = z.toJSONSchema(schema) as Record<
			string,
			unknown
		>;
		return json as Anthropic.Beta.BetaTool.InputSchema;
	};

	return [
		...READ_TOOLS.map((tool) => ({
			name: tool.name,
			description: tool.description,
			input_schema: toInputSchema(tool.schema),
		})),
		{
			name: PROPOSE,
			description:
				"The only way to change anything. Describes a batch of operations that the person will see as a card and may apply or discard. Returns immediately with whether the card was shown; the outcome arrives later as this tool's result. Batch everything one request implies into one call. For a contact's organization, pass {id} when you have one from a tool result, or {name} to match an existing organization by name or create it.",
			input_schema: toInputSchema(proposalInputSchema),
		},
	];
}

/** Built once: the tool list is part of the cached prefix and must not vary. */
const TOOLS = toolParams();

function truncate(text: string) {
	if (text.length <= RESULT_CAP) return text;
	return `${text.slice(0, RESULT_CAP)}\n…[cut at ${RESULT_CAP} characters; ask for less]`;
}

export async function* runChat({
	messages,
	tc,
	signal,
}: {
	messages: TranscriptMessage[];
	tc: ToolContext;
	signal: AbortSignal;
}): AsyncGenerator<ChatEvent> {
	const client = new Anthropic();
	const transcript = [...messages];

	for (let round = 0; round < MAX_ROUNDS; round++) {
		const stream = client.beta.messages.stream(
			{
				model: MODEL,
				max_tokens: MAX_TOKENS,
				betas: ["server-side-fallback-2026-07-01"],
				fallbacks: "default",
				thinking: { type: "adaptive", display: "summarized" },
				output_config: { effort: "medium" },
				tools: TOOLS,
				system: [
					{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
					{
						type: "text",
						text: `You are talking to ${tc.ctx.user.name} (${tc.ctx.user.email}), who is signed in. Today is ${new Date().toISOString().slice(0, 10)}.`,
					},
				],
				messages: transcript,
			},
			{ signal },
		);

		const pendingTools = new Map<
			number,
			{ id: string; name: string; json: string }
		>();

		for await (const event of stream) {
			switch (event.type) {
				case "content_block_start":
					if (event.content_block.type === "tool_use") {
						pendingTools.set(event.index, {
							id: event.content_block.id,
							name: event.content_block.name,
							json: "",
						});
					}
					break;
				case "content_block_delta":
					if (event.delta.type === "text_delta") {
						yield { type: "text", text: event.delta.text };
					} else if (event.delta.type === "thinking_delta") {
						if (event.delta.thinking)
							yield { type: "thinking", text: event.delta.thinking };
					} else if (event.delta.type === "input_json_delta") {
						const pending = pendingTools.get(event.index);
						if (pending) pending.json += event.delta.partial_json;
					}
					break;
				case "content_block_stop": {
					const pending = pendingTools.get(event.index);
					if (pending) {
						let input: Record<string, unknown> = {};
						try {
							input = pending.json ? JSON.parse(pending.json) : {};
						} catch {
							// The final message carries the parsed input; this is display only.
						}
						yield {
							type: "tool_start",
							tool: { id: pending.id, name: pending.name, input },
						};
					}
					break;
				}
			}
		}

		const message = await stream.finalMessage();
		const assistant: TranscriptMessage = {
			role: "assistant",
			content: message.content,
		};
		transcript.push(assistant);
		yield { type: "message", message: assistant };

		if (message.stop_reason === "refusal") {
			yield {
				type: "text",
				text: "I can't help with that one.",
			};
			yield { type: "done", reason: "refusal", pendingResults: [] };
			return;
		}

		if (message.stop_reason === "pause_turn") continue;

		const uses = message.content.filter(
			(block): block is Anthropic.Beta.BetaToolUseBlock =>
				block.type === "tool_use",
		);
		if (uses.length === 0) {
			yield { type: "done", reason: "end_turn", pendingResults: [] };
			return;
		}

		const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
		let proposed = false;

		for (const use of uses) {
			if (use.name === PROPOSE) {
				if (proposed) {
					const content =
						"Only one proposal per turn. Fold these operations into the first call next time; this one was not shown.";
					results.push({
						type: "tool_result",
						tool_use_id: use.id,
						is_error: true,
						content,
					});
					yield {
						type: "tool_result",
						id: use.id,
						ok: false,
						summary: "not shown",
						content,
					};
					continue;
				}
				const outcome = await validateProposal(use.id, use.input, tc);
				if (!outcome.ok) {
					const content = `Not shown to the person. Fix these and propose again:\n- ${outcome.errors.join("\n- ")}`;
					results.push({
						type: "tool_result",
						tool_use_id: use.id,
						is_error: true,
						content,
					});
					yield {
						type: "tool_result",
						id: use.id,
						ok: false,
						summary: `${outcome.errors.length} ${outcome.errors.length === 1 ? "problem" : "problems"}`,
						content,
					};
					continue;
				}
				proposed = true;
				yield { type: "proposal", proposal: outcome.proposal };
				continue;
			}

			const tool = READ_TOOLS.find((t) => t.name === use.name);
			if (!tool) {
				const content = `No tool named ${use.name}.`;
				results.push({
					type: "tool_result",
					tool_use_id: use.id,
					is_error: true,
					content,
				});
				yield {
					type: "tool_result",
					id: use.id,
					ok: false,
					summary: "unknown tool",
					content,
				};
				continue;
			}

			const parsed = tool.schema.safeParse(use.input);
			if (!parsed.success) {
				const content = `Bad input: ${parsed.error.issues
					.map((i) => `${i.path.join(".") || "input"}: ${i.message}`)
					.join("; ")}`;
				results.push({
					type: "tool_result",
					tool_use_id: use.id,
					is_error: true,
					content,
				});
				yield {
					type: "tool_result",
					id: use.id,
					ok: false,
					summary: "bad input",
					content,
				};
				continue;
			}

			try {
				const { summary, content } = await tool.run(parsed.data, tc);
				const text = truncate(JSON.stringify(content));
				results.push({
					type: "tool_result",
					tool_use_id: use.id,
					content: text,
				});
				yield {
					type: "tool_result",
					id: use.id,
					ok: true,
					summary,
					content: text,
				};
			} catch (err) {
				console.error(`[ai] ${use.name} failed`, err);
				const content =
					err instanceof Error ? err.message : "The lookup failed.";
				results.push({
					type: "tool_result",
					tool_use_id: use.id,
					is_error: true,
					content,
				});
				yield {
					type: "tool_result",
					id: use.id,
					ok: false,
					summary: "failed",
					content,
				};
			}
		}

		if (proposed) {
			// The turn ends with the proposal's tool call unanswered. The read
			// results travel to the browser and come back with the person's
			// decision, in one user message, as the API requires.
			yield { type: "done", reason: "proposal", pendingResults: results };
			return;
		}

		const user: TranscriptMessage = { role: "user", content: results };
		transcript.push(user);
		yield { type: "message", message: user };
	}

	yield {
		type: "text",
		text: "I stopped there; that took more steps than one turn allows. Ask again to continue.",
	};
	yield { type: "done", reason: "max_rounds", pendingResults: [] };
}
