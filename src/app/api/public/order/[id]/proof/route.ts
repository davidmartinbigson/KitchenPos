import { NextResponse } from "next/server";
import { and, eq, gte, isNull } from "drizzle-orm";
import { db } from "@/db";
import { orders, users } from "@/db/schema";
import { jsonError, parseId } from "@/lib/api";
import { accessState } from "@/lib/access";
import { addonEnabled } from "@/lib/addons";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const MAX_PROOF_CHARS = 300_000; // ~225KB base64 JPEG (client compresses to ~640px)

/**
 * Public: the guest attaches an online-payment screenshot (JazzCash/bank app)
 * to the QR order they just placed. Owner verifies it inside the POS inbox.
 * No login — but the order id is only knowable right after placing the order,
 * and uploads are only accepted for recent, non-voided orders.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const userId = parseId((await params).id);
  if (!userId) return jsonError("NOT_FOUND", 404);

  const restaurant = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!restaurant) return jsonError("NOT_FOUND", 404);
  if (accessState(restaurant) !== "active") return jsonError("ACCESS_INACTIVE", 403);
  if (!addonEnabled(restaurant.addons, "paymentProof")) return jsonError("ADDON_OFF", 403);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("REQUIRED", 400);
  }

  const orderId = Number(body.orderId);
  if (!Number.isInteger(orderId) || orderId <= 0) return jsonError("REQUIRED", 400);

  const image = String(body.image ?? "");
  if (!image.startsWith("data:image/") || image.length > MAX_PROOF_CHARS) {
    return jsonError("INVALID_IMAGE", 400);
  }

  // Recent orders only — nobody can stamp proof onto old history.
  const since = new Date(Date.now() - 48 * 3_600_000);
  const [updated] = await db
    .update(orders)
    .set({ paymentProof: image })
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.userId, userId),
        isNull(orders.voidedAt),
        gte(orders.createdAt, since),
      ),
    )
    .returning({ id: orders.id });

  if (!updated) return jsonError("NOT_FOUND", 404);
  return NextResponse.json({ ok: true }, { status: 201 });
}
