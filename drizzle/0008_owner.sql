-- The first owner. Everybody 0007 made an admin stays one, and from here on
-- an admin can only invite members and viewers; changing anybody already on
-- the roster is the owner's.
UPDATE "invited_user" SET "role" = 'owner'
WHERE lower("email") = 'ethanng157@gmail.com' AND "revoked_at" IS NULL;--> statement-breakpoint
INSERT INTO "invited_user" ("email", "role")
SELECT 'ethanng157@gmail.com', 'owner'
WHERE NOT EXISTS (
	SELECT 1 FROM "invited_user"
	WHERE lower("email") = 'ethanng157@gmail.com' AND "revoked_at" IS NULL
);
