import { defineConfig } from "drizzle-kit";

/**
 * Migrations are generated into `drizzle/`, committed, and applied by
 * `pnpm db:migrate`, never during a Vercel build: builds run on every push
 * including previews, so a build-time migration would let a preview branch
 * migrate production, and a failed one would take the deploy with it.
 */
export default defineConfig({
	schema: "./src/db/schema.ts",
	out: "./drizzle",
	dialect: "postgresql",
	casing: "snake_case",
	dbCredentials: {
		url: process.env.DATABASE_URL ?? "",
	},
});
