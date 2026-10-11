-- Vanity menu URLs: every shop gets /menu/<slug> (old /r/<id> keeps working).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "slug" text;
-- Backfill: slugify(shop_name) + "-" + id (deterministic & unique). Owners can
-- later claim the bare name via Settings if it's free.
UPDATE "users"
SET "slug" = trim(both '-' from regexp_replace(lower(shop_name), '[^a-z0-9]+', '-', 'g')) || '-' || id
WHERE "slug" IS NULL OR "slug" = '';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_slug_unique" ON "users" ("slug") WHERE "slug" <> '';
