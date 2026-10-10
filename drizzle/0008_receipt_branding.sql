-- Receipt branding add-on: shop logo + custom header/footer on the printed bill.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "receipt_header" text DEFAULT '' NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "receipt_footer" text DEFAULT '' NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "receipt_logo" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "receipt_size" text DEFAULT '80' NOT NULL;
