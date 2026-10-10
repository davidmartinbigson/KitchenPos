import { NextResponse } from "next/server";
import { and, desc, eq, gte, inArray, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { jsonError, requireApp } from "@/lib/api";

const LOOKBACK_HOURS = 36;
const KITCHEN_STATUSES = ["new", "preparing", "ready"] as const;
type KitchenStatus = (typeof KITCHEN_STATUSES)[number];

function isKitchenStatus(value: unknown): value is KitchenStatus {
  return typeof value === "string" && (KITCHEN_STATUSES as readonly string[]).includes(value);
}

/**
 * Kitchen display feed. Chefs only receive items whose category matches the
 * categories assigned to them (empty = everything). Owners see all items.
 */
export async function GET() {
  const guard = await requireApp(["owner", "chef"]);
  if (!guard.ok) return guard.response;
  const { session, ownerId, role } = guard;

  const since = new Date(Date.now() - LOOKBACK_HOURS * 3_600_000);

  const rows = await db.query.orders.findMany({
    where: and(eq(orders.userId, ownerId), gte(orders.createdAt, since)),
    orderBy: [desc(orders.createdAt)],
    limit: 200,
    with: { items: true },
  });

  const chefCategories =
    role === "chef" && session.type === "staff"
      ? session.staff.categories.map((c) => c.toLowerCase())
      : null;

  const feed = rows
    .map((order) => {
      const items = order.items.filter((item) => {
        const matchesCategory =
          !chefCategories ||
          chefCategories.length === 0 ||
          chefCategories.includes(item.category.toLowerCase());
        return matchesCategory && item.status !== "served";
      });

      // Completed items only stay visible for a short while after going ready.
      const recent = Date.now() - new Date(order.createdAt).getTime() < 4 * 3_600_000;
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        takenBy: order.takenBy,
        createdAt: order.createdAt,
        items: items.filter((item) => item.status !== "ready" || recent),
      };
    })
    .filter((order) => order.items.length > 0)
    .reverse();

  return NextResponse.json({
    orders: feed,
    serverTime: new Date().toISOString(),
    scope: {
      role,
      categories: role === "chef" && session.type === "staff" ? session.staff.categories : [],
    },
  });
}

/** Move one or more order items to a new kitchen status. */
export async function PATCH(request: Request) {
  const guard = await requireApp(["owner", "chef"]);
  if (!guard.ok) return guard.response;
  const { session, ownerId, role } = guard;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("REQUIRED", 400);
  }

  const rawIds = Array.isArray(body.itemIds) ? body.itemIds : [];
  const itemIds = rawIds.map((v) => Number(v)).filter((v) => Number.isInteger(v) && v > 0);
  if (itemIds.length === 0 || itemIds.length > 60) return jsonError("NO_ITEMS", 400);
  if (!isKitchenStatus(body.status)) return jsonError("INVALID_STATUS", 400);
  const targetStatus = body.status;

  // Load these items and confirm they belong to this shop's orders.
  const found = await db
    .select({
      id: orderItems.id,
      category: orderItems.category,
      orderUserId: orders.userId,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(inArray(orderItems.id, itemIds));

  const scoped = found.filter((row) => row.orderUserId === ownerId);
  if (scoped.length !== itemIds.length) return jsonError("FORBIDDEN", 403);

  // Chefs can only move items inside their assigned categories.
  if (role === "chef" && session.type === "staff") {
    const cats = session.staff.categories.map((c) => c.toLowerCase());
    if (cats.length > 0) {
      const illegal = scoped.some((row) => !cats.includes(row.category.toLowerCase()));
      if (illegal) return jsonError("FORBIDDEN", 403);
    }
  }

  const movedIds = scoped.map((r) => r.id);
  await db
    .update(orderItems)
    .set({ status: targetStatus })
    .where(inArray(orderItems.id, movedIds));

  // Kitchen pulse + guest tracking: stamp the order completed when every item is ready/served.
  // (per-item timestamps don't exist on order_items, so completion = all-ready moment.)
  if (targetStatus === "ready") {
    const touchedOrders = await db
      .select({ orderId: orderItems.orderId })
      .from(orderItems)
      .where(inArray(orderItems.id, movedIds));
    for (const row of touchedOrders) {
      if (row.orderId == null) continue;
      const remaining = await db
        .select({ id: orderItems.id })
        .from(orderItems)
        .where(
          and(
            eq(orderItems.orderId, row.orderId),
            ne(orderItems.status, "ready"),
            ne(orderItems.status, "served"),
          ),
        );
      if (remaining.length === 0) {
        await db
          .update(orders)
          .set({ completedAt: new Date() })
          .where(and(eq(orders.id, row.orderId), isNull(orders.completedAt)));
      }
    }
  }
  return NextResponse.json({ ok: true, status: targetStatus });
}
