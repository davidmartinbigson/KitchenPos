import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { jsonError, requireApp } from "@/lib/api";
import { ensureSortOrderColumn } from "@/lib/menu-sort-ensure";

/**
 * Saves the owner-arranged item order (drag & drop on the manager page).
 * Body: { ids: number[] } — every item of the shop, in visual order.
 */
export async function POST(request: Request) {
  const guard = await requireApp(["owner"]);
  if (!guard.ok) return guard.response;
  const ownerId = guard.ownerId;

  let body: { ids?: unknown };
  try {
    body = (await request.json()) as { ids?: unknown };
  } catch {
    return jsonError("REQUIRED", 400);
  }

  const ids = Array.isArray(body.ids)
    ? body.ids.map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 2000)
    : [];
  if (ids.length === 0) return jsonError("REQUIRED", 400);

  await ensureSortOrderColumn();
  await db.execute(sql`
    UPDATE menu_items m
    SET sort_order = t.rn - 1
    FROM (
      SELECT row_number() OVER () AS rn, id
      FROM unnest(${ids}::integer[]) AS t(id)
    ) t
    WHERE m.id = t.id AND m.user_id = ${ownerId}
  `);

  return NextResponse.json({ ok: true });
}
