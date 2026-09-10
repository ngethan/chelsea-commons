CREATE TABLE "tag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tag" ADD CONSTRAINT "tag_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "one_tag_per_name" ON "tag" USING btree (lower("name"));--> statement-breakpoint
-- Every tag already on a contact becomes a registry row, first spelling wins.
INSERT INTO "tag" ("name")
SELECT DISTINCT ON (lower(t)) t
FROM "contact", unnest("tags") AS t
WHERE "deleted_at" IS NULL AND btrim(t) <> ''
ORDER BY lower(t), t
ON CONFLICT DO NOTHING;
