import { pool } from "@/db";

/** Self-healing guard for the users.menu_theme column. */
let menuThemePromise: Promise<void> | null = null;

export function ensureMenuThemeColumn(): Promise<void> {
  if (!menuThemePromise) {
    menuThemePromise = (async () => {
      const { rows } = await pool.query(
        "select 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='menu_theme'",
      );
      if (rows.length > 0) return;
      await pool.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "menu_theme" jsonb`);
    })();
  }
  return menuThemePromise;
}
