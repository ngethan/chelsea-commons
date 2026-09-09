import { db } from "@/db";
import { contact, organization, update } from "@/db/schema";
import { getPost } from "@/lib/posts";
import { STATUS_LABEL, normalizeStatus } from "@/lib/status";
import {
	and,
	asc,
	count,
	desc,
	eq,
	ilike,
	inArray,
	isNotNull,
	isNull,
	or,
	sql,
} from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { EmbeddingsUnavailable, embed, embeddingsConfigured } from "./embed";

/**
 * Search over people, organizations and updates.
 *
 * Two halves, and the seam between them is the point:
 *
 * 1. `documentFor*` decides what a row *says*. An embedding is only as good
 *    as the sentence it was made from, so a contact is embedded as a short
 *    profile ("Jane Doe at Acme, committed, tagged advisor, notes: ...") and
 *    not as a JSON blob of column names.
 * 2. `index*` keeps the vectors current. It compares the document to the
 *    text the row was last embedded from and skips the ones that match, so
 *    re-running it is cheap and idempotent, and a stale row is a row whose
 *    `embedding_text` disagrees with its columns rather than a mystery.
 *
 * `search` is hybrid. Vectors are poor at the thing people search for most,
 * which is a fragment of an email address, so a plain `ILIKE` runs first and
 * its hits sit above the semantic ones. Semantic results carry a similarity
 * so the UI can show how sure it is rather than pretending every row is a
 * match.
 */

export type SearchKind = "contact" | "organization" | "update";

export type SearchHit = {
	kind: SearchKind;
	id: string;
	title: string;
	subtitle: string | null;
	/** Pipeline status for people, nothing for the others. */
	status: string | null;
	/** `text` matched the query literally; `semantic` came from the vectors. */
	match: "text" | "semantic";
	/** Cosine similarity when the vectors were consulted, else null. */
	similarity: number | null;
};

/* -------------------------------------------------------------------------- *
 * Documents
 * -------------------------------------------------------------------------- */

function line(label: string, value: string | null | undefined) {
	const text = value?.trim();
	return text ? `${label}: ${text}` : null;
}

function documentForContact(row: {
	name: string | null;
	email: string;
	phone: string | null;
	status: string;
	tags: string[];
	notes: string | null;
	organizationName: string | null;
}) {
	return [
		line("Person", row.name),
		line("Email", row.email),
		line("Organization", row.organizationName),
		line("Status", STATUS_LABEL[normalizeStatus(row.status)]),
		line("Tags", row.tags.join(", ")),
		line("Phone", row.phone),
		line("Notes", row.notes),
	]
		.filter(Boolean)
		.join("\n");
}

function documentForOrganization(row: {
	name: string;
	domain: string | null;
	notes: string | null;
	members: string[];
}) {
	return [
		line("Organization", row.name),
		line("Domain", row.domain),
		line("People", row.members.join(", ")),
		line("Notes", row.notes),
	]
		.filter(Boolean)
		.join("\n");
}

function documentForUpdate(row: { title: string; slug: string }) {
	// The markdown is in git, not in the row, and the first stretch of it is
	// what makes "the one about the summer house" findable.
	const post = getPost(row.slug);
	const body = post?.content
		.replace(/^#+\s.*$/gm, "")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 1500);
	return [
		line("Update", row.title),
		line("Slug", row.slug),
		line("Summary", post?.description),
		line("Text", body),
	]
		.filter(Boolean)
		.join("\n");
}

/* -------------------------------------------------------------------------- *
 * Indexing
 * -------------------------------------------------------------------------- */

const BATCH = 64;

type Pending = { id: string; document: string };

/**
 * Embeds what needs it and writes the vectors back, table by table. The
 * write is one `UPDATE` per row: there are at most a few hundred of them,
 * and a `VALUES` join with a vector column is not worth its own bug.
 */
async function apply(
	table: typeof contact | typeof organization | typeof update,
	pending: Pending[],
) {
	let indexed = 0;
	for (let i = 0; i < pending.length; i += BATCH) {
		const slice = pending.slice(i, i + BATCH);
		const vectors = await embed(slice.map((p) => p.document));
		for (let j = 0; j < slice.length; j++) {
			await db()
				.update(table)
				.set({ embedding: vectors[j], embeddingText: slice[j].document })
				.where(eq(table.id, slice[j].id));
			indexed += 1;
		}
	}
	return indexed;
}

type IndexOptions = {
	/** Only these rows. Omit for the whole table. */
	ids?: string[];
	/** Re-embed even rows whose document has not changed. */
	force?: boolean;
};

export async function indexContacts({ ids, force }: IndexOptions = {}) {
	const rows = await db()
		.select({
			id: contact.id,
			name: contact.name,
			email: contact.email,
			phone: contact.phone,
			status: contact.status,
			tags: contact.tags,
			notes: contact.notes,
			embeddingText: contact.embeddingText,
			organizationName: organization.name,
		})
		.from(contact)
		.leftJoin(organization, eq(organization.id, contact.organizationId))
		.where(
			and(
				isNull(contact.deletedAt),
				ids ? inArray(contact.id, ids) : undefined,
			),
		);

	const pending = rows
		.map((row) => ({ id: row.id, document: documentForContact(row) }))
		.filter((p, i) => force || p.document !== rows[i].embeddingText);

	return {
		indexed: await apply(contact, pending),
		skipped: rows.length - pending.length,
	};
}

export async function indexOrganizations({ ids, force }: IndexOptions = {}) {
	const rows = await db()
		.select({
			id: organization.id,
			name: organization.name,
			domain: organization.domain,
			notes: organization.notes,
			embeddingText: organization.embeddingText,
		})
		.from(organization)
		.where(ids ? inArray(organization.id, ids) : undefined);

	if (rows.length === 0) return { indexed: 0, skipped: 0 };

	const members = await db()
		.select({
			organizationId: contact.organizationId,
			name: contact.name,
			email: contact.email,
		})
		.from(contact)
		.where(
			and(
				isNull(contact.deletedAt),
				inArray(
					contact.organizationId,
					rows.map((r) => r.id),
				),
			),
		);

	const byOrg = new Map<string, string[]>();
	for (const m of members) {
		if (!m.organizationId) continue;
		const list = byOrg.get(m.organizationId) ?? [];
		list.push(m.name || m.email);
		byOrg.set(m.organizationId, list);
	}

	const pending = rows
		.map((row) => ({
			id: row.id,
			document: documentForOrganization({
				...row,
				members: byOrg.get(row.id) ?? [],
			}),
		}))
		.filter((p, i) => force || p.document !== rows[i].embeddingText);

	return {
		indexed: await apply(organization, pending),
		skipped: rows.length - pending.length,
	};
}

export async function indexUpdates({ ids, force }: IndexOptions = {}) {
	const rows = await db()
		.select({
			id: update.id,
			title: update.title,
			slug: update.slug,
			embeddingText: update.embeddingText,
		})
		.from(update)
		.where(ids ? inArray(update.id, ids) : undefined);

	const pending = rows
		.map((row) => ({ id: row.id, document: documentForUpdate(row) }))
		.filter((p, i) => force || p.document !== rows[i].embeddingText);

	return {
		indexed: await apply(update, pending),
		skipped: rows.length - pending.length,
	};
}

export async function indexAll(options: { force?: boolean } = {}) {
	const [contacts, organizations, updates] = [
		await indexContacts(options),
		await indexOrganizations(options),
		await indexUpdates(options),
	];
	return { contacts, organizations, updates };
}

/**
 * For the mutations. A save must never fail because the embedding API is
 * down or the key is missing, so this swallows and reports. The row is
 * simply stale until the next reindex, which `search.status` will show.
 */
export async function reindexQuietly(run: () => Promise<unknown>) {
	try {
		await run();
	} catch (err) {
		if (err instanceof EmbeddingsUnavailable) return;
		console.error("[search] indexing failed", err);
	}
}

/** What the Settings page shows: how much of each table the index covers. */
export async function indexStatus() {
	const [[contacts], [organizations], [updates]] = await Promise.all([
		db()
			.select({
				total: count(),
				embedded: count(contact.embedding),
			})
			.from(contact)
			.where(isNull(contact.deletedAt)),
		db()
			.select({
				total: count(),
				embedded: count(organization.embedding),
			})
			.from(organization),
		db()
			.select({ total: count(), embedded: count(update.embedding) })
			.from(update),
	]);

	return {
		configured: embeddingsConfigured(),
		contacts,
		organizations,
		updates,
	};
}

/* -------------------------------------------------------------------------- *
 * Querying
 * -------------------------------------------------------------------------- */

/**
 * Below this a semantic hit is noise. `text-embedding-3-small` puts unrelated
 * short texts around 0.1 to 0.25 and clear matches above 0.45, so this sits
 * in the gap. The UI shows the number, so it can be tuned by looking.
 */
const MIN_SIMILARITY = 0.3;

function vectorParam(vec: number[]) {
	return sql`${JSON.stringify(vec)}::vector`;
}

/** `1 - distance`, which is what pgvector's `<=>` leaves cosine as. */
function similarityTo(column: AnyPgColumn, vec: number[]) {
	return sql<number>`1 - (${column} <=> ${vectorParam(vec)})`;
}

async function textSearch(q: string, limit: number) {
	const needle = `%${q}%`;

	const [people, orgs, sent] = await Promise.all([
		db()
			.select({
				id: contact.id,
				name: contact.name,
				email: contact.email,
				status: contact.status,
				organizationName: organization.name,
			})
			.from(contact)
			.leftJoin(organization, eq(organization.id, contact.organizationId))
			.where(
				and(
					isNull(contact.deletedAt),
					or(
						ilike(contact.name, needle),
						ilike(contact.email, needle),
						ilike(organization.name, needle),
						sql`array_to_string(${contact.tags}, ' ') ilike ${needle}`,
					),
				),
			)
			.orderBy(asc(contact.email))
			.limit(limit),
		db()
			.select({
				id: organization.id,
				name: organization.name,
				domain: organization.domain,
			})
			.from(organization)
			.where(
				or(
					ilike(organization.name, needle),
					ilike(organization.domain, needle),
				),
			)
			.orderBy(asc(organization.name))
			.limit(limit),
		db()
			.select({ id: update.id, title: update.title, slug: update.slug })
			.from(update)
			.where(or(ilike(update.title, needle), ilike(update.slug, needle)))
			.orderBy(desc(update.createdAt))
			.limit(limit),
	]);

	const hits: SearchHit[] = [
		...people.map((r) => ({
			kind: "contact" as const,
			id: r.id,
			title: r.name || r.email,
			subtitle: r.name ? r.email : r.organizationName,
			status: r.status,
			match: "text" as const,
			similarity: null,
		})),
		...orgs.map((r) => ({
			kind: "organization" as const,
			id: r.id,
			title: r.name,
			subtitle: r.domain,
			status: null,
			match: "text" as const,
			similarity: null,
		})),
		...sent.map((r) => ({
			kind: "update" as const,
			id: r.id,
			title: r.title,
			subtitle: r.slug,
			status: null,
			match: "text" as const,
			similarity: null,
		})),
	];
	return hits;
}

async function semanticSearch(vec: number[], limit: number) {
	const [people, orgs, sent] = await Promise.all([
		db()
			.select({
				id: contact.id,
				name: contact.name,
				email: contact.email,
				status: contact.status,
				organizationName: organization.name,
				similarity: similarityTo(contact.embedding, vec),
			})
			.from(contact)
			.leftJoin(organization, eq(organization.id, contact.organizationId))
			.where(and(isNull(contact.deletedAt), isNotNull(contact.embedding)))
			.orderBy(sql`${contact.embedding} <=> ${vectorParam(vec)}`)
			.limit(limit),
		db()
			.select({
				id: organization.id,
				name: organization.name,
				domain: organization.domain,
				similarity: similarityTo(organization.embedding, vec),
			})
			.from(organization)
			.where(isNotNull(organization.embedding))
			.orderBy(sql`${organization.embedding} <=> ${vectorParam(vec)}`)
			.limit(limit),
		db()
			.select({
				id: update.id,
				title: update.title,
				slug: update.slug,
				similarity: similarityTo(update.embedding, vec),
			})
			.from(update)
			.where(isNotNull(update.embedding))
			.orderBy(sql`${update.embedding} <=> ${vectorParam(vec)}`)
			.limit(limit),
	]);

	const hits: SearchHit[] = [
		...people.map((r) => ({
			kind: "contact" as const,
			id: r.id,
			title: r.name || r.email,
			subtitle: r.name ? r.email : r.organizationName,
			status: r.status,
			match: "semantic" as const,
			similarity: Number(r.similarity),
		})),
		...orgs.map((r) => ({
			kind: "organization" as const,
			id: r.id,
			title: r.name,
			subtitle: r.domain,
			status: null,
			match: "semantic" as const,
			similarity: Number(r.similarity),
		})),
		...sent.map((r) => ({
			kind: "update" as const,
			id: r.id,
			title: r.title,
			subtitle: r.slug,
			status: null,
			match: "semantic" as const,
			similarity: Number(r.similarity),
		})),
	];
	return hits.filter((h) => (h.similarity ?? 0) >= MIN_SIMILARITY);
}

/**
 * Text hits first, in their own order; then semantic hits by similarity,
 * minus anything the text pass already found. `semantic` reports whether the
 * vectors were consulted at all, so the palette can say so when they were not
 * rather than leaving a short list to look like the whole answer.
 */
export async function search(q: string, limit = 8) {
	const query = q.trim();
	if (!query) return { semantic: false, hits: [] as SearchHit[] };

	const text = await textSearch(query, limit);

	// Two characters is a prefix, not a meaning.
	if (query.length < 3 || !embeddingsConfigured()) {
		return { semantic: false, hits: text };
	}

	let semantic: SearchHit[] = [];
	try {
		const [vec] = await embed([query]);
		semantic = await semanticSearch(vec, limit);
	} catch (err) {
		console.error("[search] semantic pass failed", err);
		return { semantic: false, hits: text };
	}

	const seen = new Set(text.map((h) => `${h.kind}:${h.id}`));
	const extra = semantic
		.filter((h) => !seen.has(`${h.kind}:${h.id}`))
		.sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));

	return { semantic: true, hits: [...text, ...extra] };
}
