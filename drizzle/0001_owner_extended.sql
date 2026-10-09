-- Owner-extended schema: countries, item limits, presence & password resets

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "country" text DEFAULT 'PK' NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "item_limit" integer DEFAULT 500 NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_seen_at" timestamp with time zone;

CREATE TABLE IF NOT EXISTS "password_resets" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_resets_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "password_resets_email_idx" ON "password_resets" USING btree ("email");
