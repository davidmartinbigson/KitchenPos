import { pool } from "@/db";

/** Self-healing guard for menu_items.sort_order (drag & drop menu ordering). */
let sortOrderPromise: Promise<void> | null = null;

export function ensureSortOrderColumn(): Promise<void> {
  if (!sortOrderPromise) {
    sortOrderPromise = (async () => {
      const { rows } = await pool.query(
        "select 1 from information_schema.columns where table_schema='public' and table_name='menu_items' and column_name='sort_order'",
      );
      if (rows.length > 0) return;
      await pool.query(`ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0 NOT NULL`);
      // First-time backfill: keep the previous visual order (category, name).
      await pool.query(
        `WITH ranked AS (SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY category ASC, name ASC, id ASC) - 1 AS rn FROM menu_items)
         UPDATE menu_items m SET sort_order = r.rn FROM ranked r WHERE m.id = r.id`,
      );
    })();
  }
  return sortOrderPromise;
}
