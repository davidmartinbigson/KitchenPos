-- Multi-branch add-on: branch rows linked to the main account.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "branch_limit" integer NOT NULL DEFAULT 1;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "parent_owner_id" integer REFERENCES "public"."users"("id") ON DELETE cascade;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_parent_owner_idx" ON "users" ("parent_owner_id");
