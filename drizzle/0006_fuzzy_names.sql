-- Trigram similarity on names, for the duplicate check. The GIN index makes
-- "names like this one" an index probe rather than a scan, so checking one
-- row against the whole list is cheap enough to run while somebody types.
-- drizzle-kit does not know this extension or index; if the schema is ever
-- regenerated, keep this file.
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contact_name_trgm_idx" ON "contact" USING gin (lower("name") gin_trgm_ops);
