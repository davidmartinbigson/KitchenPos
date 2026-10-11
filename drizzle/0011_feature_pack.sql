-- Feature pack (all opt-in add-ons): item notes, sales tax/VAT, order types,
-- customer feedback, Google review link & CRM data surface.
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "note" text NOT NULL DEFAULT '';
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tax_rate" integer NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tax_amount" integer NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "order_type" text NOT NULL DEFAULT 'dine-in';
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "rating" integer;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "feedback" text NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tax_rate" integer NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_review_url" text NOT NULL DEFAULT '';
