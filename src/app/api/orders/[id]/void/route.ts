import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { orders, users } from "@/db/schema";
import { addonEnabled } from "@/lib/addons";
import { jsonError, parseId, requireApp } from "@/lib/api";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/** Owner-only: cancel an order with a reason. Voided orders stay in the log (audit trail) but are excluded from all totals. */
export async function POST(request: Request, { params }: RouteContext) {
  const guard = await requireApp(["owner"]);
  if (!guard.ok) return guard.response;
  const { ownerId } = guard;

  const [owner] = await db
    .select({ addons: users.addons })
    .from(users)
    .where(eq(users.id, ownerId));
  if (!addonEnabled(owner?.addons, "voids")) return jsonError("ADDON_OFF", 403);

  const id = parseId((await params).id);
  if (!id) return jsonError("NOT_FOUND", 404);

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    /* void without a body is fine */
  }
  const reason = String(body.reason ?? "").trim().slice(0, 200);

  const [updated] = await db
    .update(orders)
    .set({ voidedAt: new Date(), voidReason: reason })
    .where(and(eq(orders.id, id), eq(orders.userId, ownerId), isNull(orders.voidedAt)))
    .returning({ id: orders.id, voidedAt: orders.voidedAt, voidReason: orders.voidReason });

  if (!updated) return jsonError("NOT_FOUND", 404);
  return NextResponse.json({ ok: true, voidedAt: updated.voidedAt });
}
