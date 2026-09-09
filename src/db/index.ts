import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Neon over HTTP rather than the pooled TCP driver: every caller runs in a
 * short-lived Vercel function where a connection pool is never reused. The
 * driver has no transactions, which is why the Better Auth adapter is
 * configured with `transaction: false` in `src/lib/auth.ts`.
 */
type Db = ReturnType<typeof create>;

function create() {
	const url = process.env.DATABASE_URL;
	if (!url) {
		throw new Error("DATABASE_URL is not set");
	}
	return drizzle(neon(url), { schema, casing: "snake_case" });
}

let client: Db | null = null;

export function db(): Db {
	if (!client) {
		client = create();
	}
	return client;
}

export { schema };
