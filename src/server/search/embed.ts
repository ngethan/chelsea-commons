import { EMBEDDING_DIMENSIONS } from "@/db/schema";

/**
 * The one call to an embedding API, kept to one file so the model is a fact
 * about this module rather than about every caller.
 *
 * `text-embedding-3-small` over `fetch` and nothing else: the SDK would be a
 * dependency for one endpoint, and the request is four fields. Change the
 * model here and every row has to be re-embedded (`search.reindex` with
 * `force`), because two models' vectors are not comparable, which is why the
 * width is pinned next to the schema and checked on the way back.
 */
const MODEL = "text-embedding-3-small";
const ENDPOINT = "https://api.openai.com/v1/embeddings";

/** Thrown when there is no key. Callers treat it as "no semantic search". */
export class EmbeddingsUnavailable extends Error {
	constructor() {
		super("OPENAI_API_KEY is not set, so nothing can be embedded.");
		this.name = "EmbeddingsUnavailable";
	}
}

export function embeddingsConfigured(): boolean {
	return Boolean(process.env.OPENAI_API_KEY);
}

/**
 * One vector per input, in order. Inputs are sent in one request, and the
 * endpoint accepts a few thousand at a time, so callers batch for memory and
 * for the size of the update statement that follows, not for this.
 */
export async function embed(texts: string[]): Promise<number[][]> {
	if (texts.length === 0) return [];

	const key = process.env.OPENAI_API_KEY;
	if (!key) throw new EmbeddingsUnavailable();

	const res = await fetch(ENDPOINT, {
		method: "POST",
		headers: {
			authorization: `Bearer ${key}`,
			"content-type": "application/json",
		},
		body: JSON.stringify({
			model: MODEL,
			input: texts,
			dimensions: EMBEDDING_DIMENSIONS,
		}),
	});

	if (!res.ok) {
		const body = await res.text().catch(() => "");
		throw new Error(`Embedding request failed (${res.status}): ${body}`);
	}

	const json = (await res.json()) as {
		data: Array<{ index: number; embedding: number[] }>;
	};

	const out: number[][] = new Array(texts.length);
	for (const item of json.data) {
		if (item.embedding.length !== EMBEDDING_DIMENSIONS) {
			throw new Error(
				`Expected ${EMBEDDING_DIMENSIONS} dimensions, got ${item.embedding.length}.`,
			);
		}
		out[item.index] = item.embedding;
	}
	return out;
}
