import { NextResponse } from "next/server";
import { and, count, desc, eq, gte, inArray, lt, max } from "drizzle-orm";
import { db } from "@/db";
import { menuItems, orderItems, orders, users } from "@/db/schema";
import { jsonError, requireActiveUser, requireApp } from "@/lib/api";

type IncomingLine = { menuItemId: unknown; quantity: unknown };

export async function GET(request: Request) {
  const { user, response } = await requireActiveUser();
  if (!user) return response;

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 200) || 200, 1000);

  const conditions = [eq(orders.userId, user.id)];
  if (from && !Number.isNaN(Date.parse(from))) conditions.push(gte(orders.createdAt, new Date(from)));
  if (to && !Number.isNaN(Date.parse(to))) conditions.push(lt(orders.createdAt, new Date(to)));

  const rows = await db.query.orders.findMany({
    where: and(...conditions),
    orderBy: [desc(orders.createdAt)],
    limit,
    with: { items: true },
  });

  return NextResponse.json({ orders: rows });
}

export async function POST(request: Request) {
  const guard = await requireApp(["owner", "cashier"]);
  if (!guard.ok) return guard.response;
  const { session, ownerId } = guard;

  const [ownerPref] = await db
    .select({ dailyOrderReset: users.dailyOrderReset })
    .from(users)
    .where(eq(users.id, ownerId));

  const saleByStaff = session.type === "staff";
  const staffSale = saleByStaff
    ? { staffId: session.staff.id, takenBy: session.staff.name }
    : { staffId: null, takenBy: session.type === "owner" ? session.user.name : "" };

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("REQUIRED", 400);
  }

  const rawLines = Array.isArray(body.items) ? (body.items as IncomingLine[]) : [];
  if (rawLines.length === 0 || rawLines.length > 100) return jsonError("CART_EMPTY", 400);

  const lines = rawLines.map((line) => ({
    menuItemId: Number(line.menuItemId),
    quantity: Math.floor(Number(line.quantity)),
  }));
  if (lines.some((l) => !Number.isInteger(l.menuItemId) || l.quantity < 1 || l.quantity > 99)) {
    return jsonError("CART_INVALID", 400);
  }

  const customerName = String(body.customerName ?? "").trim().slice(0, 100);

  try {
    const result = await db.transaction(async (tx) => {
      const ids = [...new Set(lines.map((l) => l.menuItemId))];
      const products = await tx
        .select()
        .from(menuItems)
        .where(and(eq(menuItems.userId, ownerId), inArray(menuItems.id, ids)));

      const productMap = new Map(products.map((p) => [p.id, p]));
      const priced = lines.map((line) => {
        const product = productMap.get(line.menuItemId);
        if (!product || !product.available) throw new Error("ITEM_UNAVAILABLE");
        return {
          menuItemId: product.id,
          name: product.name,
          unitPrice: product.price,
          quantity: line.quantity,
          lineTotal: product.price * line.quantity,
          category: product.category,
          status: "new",
        };
      });

      const subtotal = priced.reduce((sum, l) => sum + l.lineTotal, 0);
      const received = body.amountReceived === undefined || body.amountReceived === null
        ? subtotal
        : Math.round(Number(body.amountReceived));

      if (!Number.isFinite(received) || received < subtotal) throw new Error("INSUFFICIENT");

      const [{ lastNumber }] = await tx
        .select({ lastNumber: max(orders.orderNumber) })
        .from(orders)
        .where(eq(orders.userId, ownerId));

      // Same-day count (Asia/Karachi day) for the optional daily receipt counter.
      const PKT_MIN = 300;
      const localNow = new Date(Date.now() + PKT_MIN * 60_000);
      const dayStartMs =
        Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate()) - PKT_MIN * 60_000;
      const [{ value: todayCount }] = await tx
        .select({ value: count(orders.id) })
        .from(orders)
        .where(and(eq(orders.userId, ownerId), gte(orders.createdAt, new Date(dayStartMs))));

      const [order] = await tx
        .insert(orders)
        .values({
          userId: ownerId,
          staffId: staffSale.staffId,
          takenBy: staffSale.takenBy,
          orderNumber: (lastNumber ?? 0) + 1,
          dailyOrderNo: Number(todayCount ?? 0) + 1,
          customerName,
          subtotal,
          total: subtotal,
          amountReceived: received,
          changeDue: received - subtotal,
          itemCount: priced.reduce((sum, l) => sum + l.quantity, 0),
        })
        .returning();

      await tx.insert(orderItems).values(priced.map((l) => ({ ...l, orderId: order.id })));

      return order;
    });

    return NextResponse.json(
      {
        order: result,
        displayOrderNo: ownerPref?.dailyOrderReset ? result.dailyOrderNo : result.orderNumber,
      },
      { status: 201 },
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "ITEM_UNAVAILABLE") return jsonError("ITEM_UNAVAILABLE", 409);
    if (code === "INSUFFICIENT") return jsonError("INSUFFICIENT", 400);
    throw error;
  }
}
