-- Location profile for the future "food near you" discovery feature:
-- owners give city + area at signup (country already exists) so registered
-- restaurants can be browsed/filtered by locality later.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "city" text NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "area" text NOT NULL DEFAULT '';
