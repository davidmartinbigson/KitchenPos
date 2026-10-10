import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, users } from "@/db/schema";
import { parseId } from "@/lib/api";
import { parseAddons } from "@/lib/addons";

export const dynamic = "force-dynamic";

/** Polling cadence the guest client should use (seconds). */
const POLL_SECONDS = 12;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const restaurantId = parseId((await context.params).id);
  if (!restaurantId) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const url = new URL(request.url);
  const orderNumber = Number(url.searchParams.get("n"));
  if (!Number.isInteger(orderNumber) || orderNumber < 1 || orderNumber > 999_999_999) {
    return NextResponse.json({ error: "REQUIRED" }, { status: 400 });
  }

  const restaurant = await db.query.users.findFirst({ where: eq(users.id, restaurantId) });
  if (!restaurant) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (parseAddons(restaurant.addons).guestTracking !== true) {
    return NextResponse.json({ error: "NOT_ENABLED" }, { status: 403 });
  }

  const order = await db.query.orders.findFirst({
    where: and(eq(orders.userId, restaurantId), eq(orders.orderNumber, orderNumber)),
    with: { items: true },
  });
  if (!order || order.voidedAt) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const items = order.items ?? [];
  const pending = items.filter((i) => i.status === "new").length;
  const cooking = items.filter((i) => i.status === "preparing").length;
  const ready = items.filter((i) => i.status === "ready").length;
  const served = items.length ? pending + cooking + ready === 0 : false;

  let stage: "new" | "preparing" | "almost" | "ready" | "done";
  if (order.completedAt || served) stage = "done";
  else if (ready === items.length && items.length > 0) stage = "ready";
  else if (ready > 0) stage = "almost";
  else if (cooking > 0) stage = "preparing";
  else stage = "new";

  return NextResponse.json({
    poll: POLL_SECONDS,
    shopName: restaurant.shopName,
    currency: restaurant.currency,
    order: {
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      total: order.total,
      createdAt: order.createdAt,
      completedAt: order.completedAt,
      stage,
      items: items.map((i) => ({ id: i.id, name: i.name, quantity: i.quantity, status: i.status })),
    },
  });
}
