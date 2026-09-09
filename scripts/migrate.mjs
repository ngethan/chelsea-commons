import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

/**
 * Applied by hand with `pnpm db:migrate`, never during a Vercel build.
 * Builds run on every push including preview branches, so a build-time
 * migration would let a preview migrate production, and a migration that
 * fails would take the deploy down with it.
 */
const url = process.env.DATABASE_URL;
if (!url) {
	console.error("DATABASE_URL is not set. Expected it in .env.local.");
	process.exit(1);
}

await migrate(drizzle(neon(url)), { migrationsFolder: "./drizzle" });
console.log("Migrations applied.");
