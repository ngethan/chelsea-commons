-- The roster starts empty, which means nobody can sign in, including whoever
-- is deploying this. Seeding the first address here rather than behind an
-- environment variable keeps it to one step on a fresh database, and leaves
-- no permanent variable whose meaning is forgotten in six months.
--
-- CHANGE THIS ADDRESS if it is not the Google account you sign in with.
-- Idempotent: re-running it does nothing, and it will not resurrect an
-- address that was deliberately revoked later.
INSERT INTO "invited_user" ("email")
VALUES ('ethanng157@gmail.com')
ON CONFLICT DO NOTHING;
