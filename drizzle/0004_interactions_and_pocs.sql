CREATE TABLE "duplicate_dismissal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_a" uuid NOT NULL,
	"contact_b" uuid NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"topic" text,
	"summary" text NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "contact" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "contact" ADD COLUMN "pocs" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "duplicate_dismissal" ADD CONSTRAINT "duplicate_dismissal_contact_a_contact_id_fk" FOREIGN KEY ("contact_a") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duplicate_dismissal" ADD CONSTRAINT "duplicate_dismissal_contact_b_contact_id_fk" FOREIGN KEY ("contact_b") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duplicate_dismissal" ADD CONSTRAINT "duplicate_dismissal_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interaction" ADD CONSTRAINT "interaction_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interaction" ADD CONSTRAINT "interaction_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "one_dismissal_per_pair" ON "duplicate_dismissal" USING btree ("contact_a","contact_b");--> statement-breakpoint
CREATE INDEX "interaction_contact_idx" ON "interaction" USING btree ("contact_id","occurred_at" DESC NULLS LAST);