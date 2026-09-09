-- pgvector, for the semantic search under cmd-K. Neon ships the extension;
-- this only switches it on for the database. drizzle-kit does not know how
-- to write this line, so if this migration is ever regenerated, put it back.
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
ALTER TABLE "contact" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "contact" ADD COLUMN "embedding_text" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "embedding_text" text;--> statement-breakpoint
ALTER TABLE "update" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "update" ADD COLUMN "embedding_text" text;--> statement-breakpoint
CREATE INDEX "contact_embedding_idx" ON "contact" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "organization_embedding_idx" ON "organization" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "update_embedding_idx" ON "update" USING hnsw ("embedding" vector_cosine_ops);