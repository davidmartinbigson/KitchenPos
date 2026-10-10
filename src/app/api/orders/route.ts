import { NextResponse } from "next/server";
import { and, count, desc, eq, gte, inArray, lt, max } from "drizzle-orm";
import { db } from "@/db";
import { menuItems, orderItems, orders, users } from "@/db/schema";
import { jsonError, requireActiveUser, requireApp } from "@/lib/api";
import { addonEnabled, ORDER_PAYMENT_METHODS } from "@/lib/addons";

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
    .select({ dailyOrderReset: users.dailyOrderReset, addons: users.addons })
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
  const customerPhone = String(body.customerPhone ?? "").replace(/[^0-9+]/g, "").slice(0, 20);

  try {
    const result = await db.transaction(async (tx) => {
      const ids = [...new Set(lines.map((l) => l.menuItemId))];
      const products = await tx
        .select()
        .from(menuItems)
        .where(and(eq(menuItems.userId, ownerId), inArray(menuItems.id, ids)));

      const productMap = new Map(products.map((p) => [p.id, p]));
      const modifiersOn = addonEnabled(ownerPref?.addons, "modifiers");
      const priced = lines.map((line) => {
        const product = productMap.get(line.menuItemId);
        if (!product || !product.available) throw new Error("ITEM_UNAVAILABLE");
        const extras = (product.extras as { name: string; price: number }[]) ?? [];
        const ei = modifiersOn && body ? Number((line as { extraIndex?: unknown }).extraIndex) : NaN;
        const extra = Number.isInteger(ei) && ei >= 0 && ei < extras.length ? extras[ei] : null;
        const unitPrice = product.price + (extra?.price ?? 0);
        return {
          menuItemId: product.id,
          name: extra ? `${product.name} + ${extra.name}` : product.name,
          unitPrice,
          quantity: line.quantity,
          lineTotal: unitPrice * line.quantity,
          category: product.category,
          costPrice: product.costPrice,
          status: "new",
        };
      });

      const subtotal = priced.reduce((sum, l) => sum + l.lineTotal, 0);

      // Add-on: checkout discount (validated & re-computed server-side).
      let discountType = "none";
      let discountValue = 0;
      let discountAmount = 0;
      if (addonEnabled(ownerPref?.addons, "discounts")) {
        const d = (body.discount ?? null) as { type?: unknown; value?: unknown } | null;
        const type = d && d.type === "flat" ? "flat" : d && d.type === "percent" ? "percent" : null;
        const value = Math.max(0, Math.round(Number(d?.value) || 0));
        if (type && value > 0) {
          discountType = type;
          discountValue = type === "percent" ? Math.min(value, 90) : value;
          discountAmount =
            type === "percent" ? Math.round((subtotal * discountValue) / 100) : Math.min(value, subtotal);
        }
      }
      const total = subtotal - discountAmount;

      // Add-on: payment method tag.
      const paymentMethod =
        addonEnabled(ownerPref?.addons, "payments") &&
        (ORDER_PAYMENT_METHODS as readonly string[]).includes(String(body.paymentMethod))
          ? String(body.paymentMethod)
          : "cash";

      // Add-on: stock — check & decrement inside the same transaction.
      if (addonEnabled(ownerPref?.addons, "stock")) {
        for (const line of priced) {
          const row = products.find((m) => m.id === line.menuItemId);
          if (row && row.stockQty != null) {
            if (row.stockQty < line.quantity) throw new Error("STOCK_SHORT");
            await tx
              .update(menuItems)
              .set({ stockQty: row.stockQty - line.quantity })
              .where(eq(menuItems.id, row.id));
          }
        }
      }

      const received = body.amountReceived === undefined || body.amountReceived === null
        ? total
        : Math.round(Number(body.amountReceived));

      if (!Number.isFinite(received) || received < total) throw new Error("INSUFFICIENT");

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
          customerPhone: addonEnabled(ownerPref?.addons, "whatsappCustomer") ? customerPhone : "",
          subtotal,
          total,
          discountType,
          discountValue,
          discountAmount,
          paymentMethod,
          amountReceived: received,
          changeDue: received - total,
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
    if (code === "STOCK_SHORT") return jsonError("STOCK_SHORT", 409);
    throw error;
  }
}
