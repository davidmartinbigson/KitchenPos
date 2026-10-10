import { NextResponse } from "next/server";
import { and, eq, gte, isNull, lt } from "drizzle-orm";
import { db } from "@/db";
import { orders, expenses, users } from "@/db/schema";
import { requireApp } from "@/lib/api";
import { sendDailySummaryEmail } from "@/lib/mail";
import { accessState } from "@/lib/access";

export const dynamic = "force-dynamic";

// Evening window in UTC = 19:00–22:59 Pakistan time (PKT = UTC+5).
function inEveningWindow(): boolean {
  const h = new Date().getUTCHours();
  return h >= 14 && h <= 17;
}

async function summaryFor(userId: number) {
  const now = new Date();
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  const tomorrow = new Date(from);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [dayOrders, dayExpenses, pendingCount] = await Promise.all([
    db.query.orders.findMany({
      where: and(gte(orders.createdAt, from), lt(orders.createdAt, tomorrow), eq(orders.userId, userId)),
      columns: { total: true },
    }),
    db.query.expenses.findMany({
      where: and(gte(expenses.createdAt, from), lt(expenses.createdAt, tomorrow), eq(expenses.userId, userId)),
      columns: { amount: true },
    }),
    db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.userId, userId), isNull(orders.completedAt))),
  ]);

  return {
    revenue: dayOrders.reduce((s, o) => s + o.total, 0),
    orderCount: dayOrders.length,
    expenseTotal: dayExpenses.reduce((s, e) => s + e.amount, 0),
    pendingOrders: pendingCount.length,
  };
}

async function sendForUser(u: { id: number; email: string; shopName: string; currency: string }): Promise<boolean> {
  const sum = await summaryFor(u.id);
  if (sum.orderCount === 0 && sum.expenseTotal === 0) return false;
  return await sendDailySummaryEmail({
    to: u.email,
    shopName: u.shopName,
    currency: u.currency,
    ...sum,
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = process.env.CRON_SECRET;

  // Path A: external cron / manual trigger with the secret key.
  if (secret && url.searchParams.get("key") === secret) {
    const owners = await db.select().from(users);
    let sent = 0;
    let skipped = 0;
    for (const u of owners) {
      if (u.role !== "owner" || accessState(u) !== "active") continue;
      try {
        if (await sendForUser(u)) sent++;
        else skipped++;
      } catch {
        skipped++;
      }
    }
    return NextResponse.json({ ok: true, mode: "broadcast", sent, skipped });
  }

  // Path B: lazy auto-trigger from the signed-in owner's app (deduped client-side).
  if (url.searchParams.get("auto") === "1") {
    const guard = await requireApp(["owner"]);
    if (!guard.ok) return guard.response;
    if (!inEveningWindow()) return NextResponse.json({ ok: true, sent: false, reason: "outside_window" });
    try {
      const sent = await sendForUser({
        id: guard.ownerId,
        email: guard.session.type === "owner" ? guard.session.user.email : "",
        shopName: guard.session.type === "owner" ? guard.session.user.shopName : "",
        currency: guard.session.type === "owner" ? guard.session.user.currency : "PKR",
      });
      return NextResponse.json({ ok: true, sent });
    } catch {
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}
