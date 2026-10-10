import { NextResponse } from "next/server";
import { and, desc, eq, gte, isNull } from "drizzle-orm";
import { db } from "@/db";
import { expenses, orders, shifts } from "@/db/schema";
import { addonEnabled } from "@/lib/addons";
import { jsonError, requireApp } from "@/lib/api";
import { users } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cash drawer shifts (add-on): open with opening cash, close by counting — expected vs counted difference. */

export async function GET() {
  const guard = await requireApp(["owner"]);
  if (!guard.ok) return guard.response;
  const { ownerId } = guard;

  const recent = await db
    .select()
    .from(shifts)
    .where(eq(shifts.userId, ownerId))
    .orderBy(desc(shifts.openedAt))
    .limit(6);
  const active = recent.find((s) => s.closedAt === null) ?? null;
  return NextResponse.json({ active, recent: recent.filter((s) => s.closedAt !== null).slice(0, 5) });
}

export async function POST(request: Request) {
  const guard = await requireApp(["owner"]);
  if (!guard.ok) return guard.response;
  const { ownerId } = guard;

  const [owner] = await db.select({ addons: users.addons }).from(users).where(eq(users.id, ownerId));
  if (!addonEnabled(owner?.addons, "cashShift")) return jsonError("ADDON_OFF", 403);

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    /* action-only posts allowed */
  }
  const action = String(body.action ?? "");

  const [active] = await db
    .select()
    .from(shifts)
    .where(and(eq(shifts.userId, ownerId), isNull(shifts.closedAt)))
    .limit(1);

  if (action === "open") {
    if (active) return jsonError("SHIFT_ALREADY_OPEN", 409);
    const openingCash = Math.max(0, Math.round(Number(body.openingCash) || 0));
    const [row] = await db.insert(shifts).values({ userId: ownerId, openingCash }).returning();
    return NextResponse.json({ active: row }, { status: 201 });
  }

  if (action === "close") {
    if (!active) return jsonError("NO_OPEN_SHIFT", 404);
    const countedCash = Math.max(0, Math.round(Number(body.countedCash) || 0));

    const since = active.openedAt;
    const cashOrders = await db
      .select({ total: orders.total })
      .from(orders)
      .where(
        and(
          eq(orders.userId, ownerId),
          gte(orders.createdAt, since),
          isNull(orders.voidedAt),
          eq(orders.paymentMethod, "cash"),
        ),
      )
      .limit(5000);
    const cashOrdersOnly = cashOrders.reduce((s, o) => s + o.total, 0);
    const dayExpenses = await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.userId, ownerId), gte(expenses.createdAt, since)));
    const cashOut = dayExpenses.reduce((s, e) => s + e.amount, 0);
    const expectedCash = active.openingCash + cashOrdersOnly - cashOut;

    const [closed] = await db
      .update(shifts)
      .set({
        closedAt: new Date(),
        expectedCash,
        countedCash,
        difference: countedCash - expectedCash,
      })
      .where(eq(shifts.id, active.id))
      .returning();
    return NextResponse.json({ closed });
  }

  return jsonError("REQUIRED", 400);
}
