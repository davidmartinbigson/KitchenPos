-- Owner drag & drop menu order.
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0 NOT NULL;
WITH ranked AS (SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY category ASC, name ASC, id ASC) - 1 AS rn FROM menu_items) UPDATE menu_items m SET sort_order = r.rn FROM ranked r WHERE m.id = r.id;
