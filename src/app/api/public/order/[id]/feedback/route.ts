import { NextResponse } from "next/server";
import { and, eq, gte, isNull } from "drizzle-orm";
import { db } from "@/db";
import { orders, users } from "@/db/schema";
import { jsonError, parseId } from "@/lib/api";
import { accessState } from "@/lib/access";
import { parseAddons } from "@/lib/addons";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Public: guest leaves a 1–5 star rating + optional comment after their order
 * (Feedback add-on). One rating per order, recent orders only.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const userId = parseId((await params).id);
  if (!userId) return jsonError("NOT_FOUND", 404);

  const restaurant = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!restaurant) return jsonError("NOT_FOUND", 404);
  if (accessState(restaurant) !== "active") return jsonError("ACCESS_INACTIVE", 403);
  if (parseAddons(restaurant.addons).feedback !== true) return jsonError("ADDON_OFF", 403);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("REQUIRED", 400);
  }

  const orderNumber = Number(body.orderNumber);
  const rating = Math.round(Number(body.rating));
  const feedback = String(body.comment ?? "").trim().slice(0, 280);
  if (!Number.isInteger(orderNumber) || orderNumber < 1) return jsonError("REQUIRED", 400);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return jsonError("INVALID_RATING", 400);

  const since = new Date(Date.now() - 7 * 24 * 3_600_000);
  const [updated] = await db
    .update(orders)
    .set({ rating, feedback })
    .where(
      and(
        eq(orders.userId, userId),
        eq(orders.orderNumber, orderNumber),
        isNull(orders.voidedAt),
        isNull(orders.rating),
        gte(orders.createdAt, since),
      ),
    )
    .returning({ id: orders.id });

  if (!updated) return jsonError("NOT_FOUND", 404);
  return NextResponse.json({ ok: true }, { status: 201 });
}
