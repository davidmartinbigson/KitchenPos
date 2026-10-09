import { NextResponse } from "next/server";
import { and, count, desc, eq, gte, sql, sum } from "drizzle-orm";
import { db } from "@/db";
import { menuItems, orderItems, orders } from "@/db/schema";
import { requireActiveUser } from "@/lib/api";

/** Format a Date's UTC fields as YYYY-MM-DD */
function utcKey(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

/**
 * GET /api/stats?days=7&tz=-300&today=2026-01-31
 * tz = JS Date.getTimezoneOffset() of the client (minutes, positive west of UTC).
 * today = client's local date (YYYY-MM-DD) so "today" matches the user's clock.
 */
export async function GET(request: Request) {
  const { user, response } = await requireActiveUser();
  if (!user) return response;

  const url = new URL(request.url);
  const days = Math.min(Math.max(Number(url.searchParams.get("days") ?? 7) || 7, 1), 365);
  const tzOffset = Number(url.searchParams.get("tz") ?? 0) || 0; // minutes
  const todayParam = url.searchParams.get("today");

  const now = new Date();
  const localNow = new Date(now.getTime() - tzOffset * 60_000);
  const todayKey =
    todayParam && /^\d{4}-\d{2}-\d{2}$/.test(todayParam) ? todayParam : utcKey(localNow);

  const [ty, tm, td] = todayKey.split("-").map(Number);
  const todayUtcMidnight = Date.UTC(ty, tm - 1, td);
  const startLocalMs = todayUtcMidnight - (days - 1) * 86_400_000;
  // Local midnight expressed as a UTC instant: local = utc - offset
  const fromInstant = new Date(startLocalMs + tzOffset * 60_000);

  // Local wall-clock timestamp of each order, grouped by local day.
  // The offset is a validated integer, inlined as a literal so the SELECT and GROUP BY
  // expressions are identical (bound parameters would differ between the two clauses).
  const offsetLiteral = sql.raw(String(Math.trunc(tzOffset)));
  const localDay = sql<string>`to_char((${orders.createdAt} AT TIME ZONE 'UTC') - (${offsetLiteral} * interval '1 minute'), 'YYYY-MM-DD')`;

  const dailyRows = await db
    .select({
      day: localDay,
      revenue: sum(orders.total).mapWith(Number),
      orderCount: count(orders.id).mapWith(Number),
    })
    .from(orders)
    .where(and(eq(orders.userId, user.id), gte(orders.createdAt, fromInstant)))
    .groupBy(localDay);

  const dailyMap = new Map(dailyRows.map((r) => [r.day, r]));
  const daily = Array.from({ length: days }, (_, i) => {
    const key = utcKey(new Date(startLocalMs + i * 86_400_000));
    const row = dailyMap.get(key);
    return { day: key, revenue: row?.revenue ?? 0, orders: row?.orderCount ?? 0 };
  });

  const [totals] = await db
    .select({
      revenue: sum(orders.total).mapWith(Number),
      orderCount: count(orders.id).mapWith(Number),
    })
    .from(orders)
    .where(eq(orders.userId, user.id));

  const [menuCount] = await db
    .select({ value: count(menuItems.id).mapWith(Number) })
    .from(menuItems)
    .where(eq(menuItems.userId, user.id));

  const todayRow = dailyMap.get(todayKey);

  const topItems = await db
    .select({
      name: orderItems.name,
      quantity: sum(orderItems.quantity).mapWith(Number),
      revenue: sum(orderItems.lineTotal).mapWith(Number),
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(eq(orders.userId, user.id))
    .groupBy(orderItems.name)
    .orderBy(desc(sum(orderItems.quantity)))
    .limit(5);

  const totalRevenue = totals?.revenue ?? 0;
  const totalOrders = totals?.orderCount ?? 0;

  return NextResponse.json({
    today: {
      day: todayKey,
      revenue: todayRow?.revenue ?? 0,
      orders: todayRow?.orderCount ?? 0,
    },
    totals: {
      revenue: totalRevenue,
      orders: totalOrders,
      averageOrder: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
      menuItems: menuCount?.value ?? 0,
    },
    daily,
    topItems,
  });
}
