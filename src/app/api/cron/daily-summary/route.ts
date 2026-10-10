import { NextResponse } from "next/server";
import { and, eq, gte, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import { expenses, orders, users } from "@/db/schema";
import { sendDailySummaryEmail } from "@/lib/summary-mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily summary cron — runs at 19:00 UTC (= 00:00 midnight PKT, Asia/Karachi).
 * Sends every ACTIVE owner their end-of-day report: sale, orders, expenses, bachat.
 * Guarded by a Bearer secret so random visitors can't trigger mass email sends.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
  }

  const now = new Date();
  // Asia/Karachi is fixed UTC+5 (no DST). Compute today's boundaries in PKT.
  const PKT_OFFSET_MIN = 300;
  const nowPkt = new Date(now.getTime() + PKT_OFFSET_MIN * 60_000);
  const dayStartUtcMs = Date.UTC(nowPkt.getUTCFullYear(), nowPkt.getUTCMonth(), nowPkt.getUTCDate()) - PKT_OFFSET_MIN * 60_000;
  const from = new Date(dayStartUtcMs);
  const to = new Date(dayStartUtcMs + 24 * 60 * 60 * 1000);
  const dateLabel = nowPkt.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  const owners = await db
    .select({
      id: users.id,
      email: users.email,
      shopName: users.shopName,
      currency: users.currency,
      suspended: users.suspended,
      accessExpiresAt: users.accessExpiresAt,
    })
    .from(users)
    .where(ne(users.role, "admin"));

  let sent = 0;
  const skipped: string[] = [];

  for (const owner of owners) {
    const active = !owner.suspended && owner.accessExpiresAt !== null && owner.accessExpiresAt > now;
    if (!active) continue;

    const dayOrders = await db.query.orders.findMany({
      where: and(eq(orders.userId, owner.id), gte(orders.createdAt, from), lt(orders.createdAt, to)),
      with: { items: true },
    });
    const dayExpenses = await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.userId, owner.id), gte(expenses.createdAt, from), lt(expenses.createdAt, to)));

    const activeOrders = dayOrders.filter((o) => !o.voidedAt);
    if (activeOrders.length === 0 && dayExpenses.length === 0) {
      skipped.push(owner.email);
      continue; // nothing happened today — don't send a pointless email
    }

    const sale = activeOrders.reduce((s, o) => s + o.total, 0);
    const expensesTotal = dayExpenses.reduce((s, e) => s + e.amount, 0);
    const tally = new Map<string, number>();
    for (const o of activeOrders) {
      for (const it of o.items) tally.set(it.name, (tally.get(it.name) ?? 0) + it.quantity);
    }
    let topItem: { name: string; qty: number } | null = null;
    for (const [name, qty] of tally) if (!topItem || qty > topItem.qty) topItem = { name, qty };

    try {
      const ok = await sendDailySummaryEmail(owner.email, owner.shopName, {
        dateLabel,
        sale,
        ordersCount: activeOrders.length,
        expensesTotal,
        bachat: sale - expensesTotal,
        topItem,
        currency: owner.currency,
      });
      if (ok) sent += 1;
    } catch {
      /* one bad email shouldn't stop the rest */
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, date: from.toISOString() });
}
