ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "completed_at" timestamp with time zone;
--> statement-breakpoint
-- Backfill: orders whose items are all ready/served are complete; use created_at as best known timestamp.
UPDATE "orders" o
SET "completed_at" = o."created_at"
WHERE "completed_at" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "order_items" oi
    WHERE oi.order_id = o.id AND oi.status NOT IN ('ready', 'served')
  );
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_completed_idx" ON "orders" ("user_id", "completed_at") WHERE "completed_at" IS NOT NULL;
