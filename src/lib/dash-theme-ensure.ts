import { pool } from "@/db";

/** Self-healing guard for the users.dash_theme column. */
let dashThemePromise: Promise<void> | null = null;

export function ensureDashThemeColumn(): Promise<void> {
  if (!dashThemePromise) {
    dashThemePromise = (async () => {
      const { rows } = await pool.query(
        "select 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='dash_theme'",
      );
      if (rows.length > 0) return;
      await pool.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dash_theme" jsonb`);
    })();
  }
  return dashThemePromise;
}
