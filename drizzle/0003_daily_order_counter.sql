-- Optional daily receipt counter: orders get a same-day sequence number (PKT day)
-- and owners can switch receipt numbering to restart from 1 every day.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "daily_order_reset" boolean DEFAULT false NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "daily_order_no" integer DEFAULT 0 NOT NULL;
