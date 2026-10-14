import { pool } from "@/db";

/** Self-healing guard for the chat_leads table (mirrors ensureBranchSchema). */
let chatLeadsPromise: Promise<void> | null = null;

export function ensureChatLeadsTable(): Promise<void> {
  if (!chatLeadsPromise) {
    chatLeadsPromise = (async () => {
      const { rows } = await pool.query(
        "select 1 from information_schema.tables where table_schema='public' and table_name='chat_leads'",
      );
      if (rows.length > 0) return;
      await pool.query(`CREATE TABLE IF NOT EXISTS "chat_leads" (
        "id" serial PRIMARY KEY,
        "name" text NOT NULL DEFAULT '',
        "kind" text NOT NULL DEFAULT 'customer',
        "country" text NOT NULL DEFAULT '',
        "city" text NOT NULL DEFAULT '',
        "phone" text NOT NULL,
        "restaurant" text NOT NULL DEFAULT '',
        "created_at" timestamptz NOT NULL DEFAULT now()
      )`);
    })();
  }
  return chatLeadsPromise;
}

let restaurantColPromise: Promise<void> | null = null;

/** Adds the restaurant column on existing installs (table may predate it). */
export function ensureLeadRestaurantColumn(): Promise<void> {
  if (!restaurantColPromise) {
    restaurantColPromise = (async () => {
      await ensureChatLeadsTable();
      const { rows } = await pool.query(
        "select 1 from information_schema.columns where table_schema='public' and table_name='chat_leads' and column_name='restaurant'",
      );
      if (rows.length > 0) return;
      await pool.query(`ALTER TABLE "chat_leads" ADD COLUMN IF NOT EXISTS "restaurant" text NOT NULL DEFAULT ''`);
    })();
  }
  return restaurantColPromise;
}

/** Keep exactly one leading "+" and digits; require 7–15 digit length. */
export function normalizeLeadPhone(raw: string): string | null {
  const cleaned = raw.replace(/[^\d+]/g, "");
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return cleaned.startsWith("+") ? `+${digits}` : digits;
}
