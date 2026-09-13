-- Roles on the roster. Everybody already on it becomes an admin: they could
-- do everything yesterday, and the first admin has to come from somewhere.
-- Invites made from now on default to member.
ALTER TABLE "invited_user" ADD COLUMN "role" text DEFAULT 'member' NOT NULL;--> statement-breakpoint
UPDATE "invited_user" SET "role" = 'admin';
