-- 0005: remaining add-ons — extras/sizes, profit cost price, tables count, customer phone, cash shift
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "extras" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "cost_price" integer DEFAULT 0 NOT NULL;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "cost_price" integer DEFAULT 0 NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customer_phone" text DEFAULT '' NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "table_count" integer DEFAULT 12 NOT NULL;

CREATE TABLE IF NOT EXISTS "shifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"opening_cash" integer DEFAULT 0 NOT NULL,
	"closed_at" timestamp with time zone,
	"expected_cash" integer DEFAULT 0 NOT NULL,
	"counted_cash" integer DEFAULT 0 NOT NULL,
	"difference" integer DEFAULT 0 NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	CONSTRAINT "shifts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);
CREATE INDEX IF NOT EXISTS "shifts_user_open_idx" ON "shifts" USING btree ("user_id","opened_at");
