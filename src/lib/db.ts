import { type NeonQueryFunction, neon } from "@neondatabase/serverless";

/**
 * Neon over HTTP (not the pooled TCP driver) because every caller here runs in
 * a short-lived Vercel function where a connection pool never gets reused.
 */
let client: NeonQueryFunction<false, false> | null = null;

export function db() {
	const url = process.env.DATABASE_URL;
	if (!url) {
		throw new Error("DATABASE_URL is not set");
	}
	if (!client) {
		client = neon(url);
	}
	return client;
}

/**
 * Schema lives here rather than in a migration tool: this is a two-table
 * tracker, and running `create table if not exists` on the first cold start
 * removes a deploy step. The statements go in one `transaction()` so that is
 * a single HTTP round trip, not one per statement: the click redirect and the
 * open pixel both wait on this, and a human is waiting on the redirect.
 */
let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
	if (!schemaReady) {
		schemaReady = (async () => {
			const sql = db();
			await sql.transaction([
				sql`
					create table if not exists email_sends (
						ref text primary key,
						campaign text not null,
						email text not null,
						name text,
						resend_id text,
						destination text,
						status text not null default 'pending',
						error text,
						created_at timestamptz not null default now()
					)
				`,
				// Predates the destination column above; a no-op on a fresh database
				// and the migration on one created before per-send destinations.
				sql`alter table email_sends add column if not exists destination text`,
				sql`
					create index if not exists email_sends_campaign_idx
						on email_sends (campaign, created_at desc)
				`,
				sql`
					create table if not exists email_events (
						id bigserial primary key,
						ref text not null references email_sends (ref) on delete cascade,
						kind text not null,
						target text,
						user_agent text,
						ip text,
						created_at timestamptz not null default now()
					)
				`,
				sql`
					create index if not exists email_events_ref_idx
						on email_events (ref, created_at desc)
				`,
			]);
		})().catch((err) => {
			// Don't cache a failed init, or every later request in this instance
			// resolves against a schema that was never created.
			schemaReady = null;
			throw err;
		});
	}
	return schemaReady;
}
