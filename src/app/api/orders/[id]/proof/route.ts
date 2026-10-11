import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { jsonError, parseId, requireApp } from "@/lib/api";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/** Owner/cashier: fetch one order's payment-proof image (kept out of list responses). */
export async function GET(_request: Request, { params }: RouteContext) {
  const guard = await requireApp(["owner", "cashier"]);
  if (!guard.ok) return guard.response;
  const { ownerId } = guard;

  const id = parseId((await params).id);
  if (!id) return jsonError("NOT_FOUND", 404);

  const [row] = await db
    .select({ paymentProof: orders.paymentProof })
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.userId, ownerId)))
    .limit(1);

  if (!row) return jsonError("NOT_FOUND", 404);
  return NextResponse.json({ proof: row.paymentProof ?? null });
}
