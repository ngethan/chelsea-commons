-- Posts move out of `content/blog` and into the database, and `update` folds
-- into the post row it was always pointing at by slug.
--
-- Every existing update becomes a published private letter carrying its own
-- title and an empty document. The converter in `scripts/` fills those in from
-- the markdown files, matching on slug. Links repoint by the same join, so the
-- clicks already collected stay attached to the thing that was clicked.
CREATE TABLE "post" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"subtitle" text,
	"doc" jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"kind" text DEFAULT 'post' NOT NULL,
	"published_at" timestamp with time zone,
	"date_label" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"embedding" vector(1536),
	"embedding_text" text,
	CONSTRAINT "post_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "post_revision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"name" text NOT NULL,
	"doc" jsonb NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_revision" ADD CONSTRAINT "post_revision_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_revision" ADD CONSTRAINT "post_revision_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_embedding_idx" ON "post" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "post_updated_idx" ON "post" USING btree ("updated_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "post_revision_post_idx" ON "post_revision" USING btree ("post_id","created_at" DESC NULLS FIRST);--> statement-breakpoint

-- One post per update, kept in the state every letter was already in:
-- published, so the link in somebody's inbox still resolves, and private, so
-- it stays off /writing. The empty document is a placeholder the converter
-- overwrites; a letter whose markdown file is gone keeps its title and its
-- clicks and renders as an empty page, which is the truth about it.
INSERT INTO "post" ("slug", "name", "doc", "status", "visibility", "kind", "published_at", "created_by", "created_at", "updated_at")
SELECT "slug", "title", '{"type":"doc","content":[]}'::jsonb, 'published', 'private', 'letter', "created_at", "created_by", "created_at", "created_at"
FROM "update";--> statement-breakpoint

ALTER TABLE "link" ADD COLUMN "post_id" uuid;--> statement-breakpoint
UPDATE "link" SET "post_id" = "post"."id"
FROM "update", "post"
WHERE "link"."update_id" = "update"."id" AND "post"."slug" = "update"."slug";--> statement-breakpoint
ALTER TABLE "link" ALTER COLUMN "post_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "link" DROP CONSTRAINT "link_update_id_update_id_fk";--> statement-breakpoint
DROP INDEX "one_link_per_contact_per_update";--> statement-breakpoint
DROP INDEX "link_update_idx";--> statement-breakpoint
ALTER TABLE "link" DROP COLUMN "update_id";--> statement-breakpoint
ALTER TABLE "link" ADD CONSTRAINT "link_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "one_link_per_contact_per_post" ON "link" USING btree ("contact_id","post_id");--> statement-breakpoint
CREATE INDEX "link_post_idx" ON "link" USING btree ("post_id");--> statement-breakpoint

DROP TABLE "update";
