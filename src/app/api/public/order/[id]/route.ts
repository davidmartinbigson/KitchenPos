import { NextResponse } from "next/server";
import { and, count, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { menuItems, orderItems, orders, users } from "@/db/schema";
import { jsonError, parseId } from "@/lib/api";
import { accessState } from "@/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };
type IncomingLine = { menuItemId: unknown; quantity: unknown };

/**
 * Public guest ordering endpoint (QR table menu). No login required —
 * prices and availability are always re-checked against the database.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const userId = parseId((await params).id);
  if (!userId) return jsonError("NOT_FOUND", 404);

  const restaurant = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!restaurant) return jsonError("NOT_FOUND", 404);
  if (accessState(restaurant) !== "active") return jsonError("ACCESS_INACTIVE", 403);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("REQUIRED", 400);
  }

  const rawLines = Array.isArray(body.items) ? (body.items as IncomingLine[]) : [];
  if (rawLines.length === 0 || rawLines.length > 40) return jsonError("CART_EMPTY", 400);

  const lines = rawLines.map((line) => ({
    menuItemId: Number(line.menuItemId),
    quantity: Math.floor(Number(line.quantity)),
  }));
  if (lines.some((l) => !Number.isInteger(l.menuItemId) || l.quantity < 1 || l.quantity > 20)) {
    return jsonError("CART_INVALID", 400);
  }

  const ids = [...new Set(lines.map((l) => l.menuItemId))];
  const menu = await db
    .select()
    .from(menuItems)
    .where(and(eq(menuItems.userId, userId), eq(menuItems.available, true), inArray(menuItems.id, ids)));
  const byId = new Map(menu.map((m) => [m.id, m]));
  if (menu.length !== ids.length) return jsonError("CART_INVALID", 400);

  const priced = lines.map((l) => {
    const item = byId.get(l.menuItemId)!;
    return {
      menuItemId: item.id,
      name: item.name,
      category: item.category,
      unitPrice: item.price,
      quantity: l.quantity,
      lineTotal: item.price * l.quantity,
    };
  });
  const total = priced.reduce((s, l) => s + l.lineTotal, 0);
  const itemCount = priced.reduce((s, l) => s + l.quantity, 0);
  if (total <= 0) return jsonError("CART_INVALID", 400);

  const customerName = String(body.customerName ?? "").trim().slice(0, 100);

  const result = await db.transaction(async (tx) => {
    const latest = await tx.query.orders.findFirst({
      where: eq(orders.userId, userId),
      orderBy: (t, { desc }) => [desc(t.orderNumber)],
    });
    const orderNumber = (latest?.orderNumber ?? 0) + 1;
    const PKT_MIN = 300;
    const localNow = new Date(Date.now() + PKT_MIN * 60_000);
    const dayStartMs =
      Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate()) - PKT_MIN * 60_000;
    const [{ value: todayCount }] = await tx
      .select({ value: count(orders.id) })
      .from(orders)
      .where(and(eq(orders.userId, userId), gte(orders.createdAt, new Date(dayStartMs))));
    const [order] = await tx
      .insert(orders)
      .values({
        userId,
        orderNumber,
        dailyOrderNo: Number(todayCount ?? 0) + 1,
        customerName,
        takenBy: "QR Order",
        subtotal: total,
        total,
        amountReceived: total,
        changeDue: 0,
        itemCount,
      })
      .returning({
        id: orders.id,
        orderNumber: orders.orderNumber,
        dailyOrderNo: orders.dailyOrderNo,
        total: orders.total,
      });
    await tx.insert(orderItems).values(
      priced.map((l) => ({
        orderId: order.id,
        menuItemId: l.menuItemId,
        name: l.name,
        unitPrice: l.unitPrice,
        quantity: l.quantity,
        lineTotal: l.lineTotal,
        category: l.category,
      })),
    );
    return order;
  });

  const displayOrderNo = restaurant.dailyOrderReset ? result.dailyOrderNo : result.orderNumber;
  return NextResponse.json({ orderNumber: displayOrderNo, total: result.total }, { status: 201 });
}
