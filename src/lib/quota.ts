import { pool } from "@/db";

/**
 * Self-healing guard for the staff-limit quota column (mirrors ensureBranchSchema).
 * Every quota code path calls this first, so the deploy stays safe even before
 * /api/setup-schema runs migration 0015.
 */

let staffLimitPromise: Promise<void> | null = null;

export function ensureStaffLimitColumn(): Promise<void> {
  if (!staffLimitPromise) {
    staffLimitPromise = (async () => {
      const { rows } = await pool.query(
        "select 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='staff_limit'",
      );
      if (rows.length > 0) return;
      await pool.query(
        `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "staff_limit" integer NOT NULL DEFAULT 3`,
      );
    })();
  }
  return staffLimitPromise;
}

export async function staffQuotaOf(ownerId: number): Promise<{ used: number; limit: number }> {
  await ensureStaffLimitColumn();
  const { rows: lims } = await pool.query<{ staffLimit: number }>(
    'SELECT staff_limit AS "staffLimit" FROM users WHERE id = $1 LIMIT 1',
    [ownerId],
  );
  const { rows: counts } = await pool.query<{ cnt: number }>(
    'SELECT count(*)::int AS cnt FROM staff WHERE owner_id = $1',
    [ownerId],
  );
  return { used: counts[0]?.cnt ?? 0, limit: lims[0]?.staffLimit ?? 3 };
}
