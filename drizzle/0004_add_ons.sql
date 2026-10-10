-- Add-on system (opt-in features) + discount/payment-method/void on orders + stock on items
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "addons" jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "discount_type" text DEFAULT 'none' NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "discount_value" integer DEFAULT 0 NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "discount_amount" integer DEFAULT 0 NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_method" text DEFAULT 'cash' NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "voided_at" timestamp with time zone;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "void_reason" text DEFAULT '' NOT NULL;
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "stock_qty" integer;
