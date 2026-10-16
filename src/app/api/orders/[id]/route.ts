import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { jsonError, parseId, requireApp } from "@/lib/api";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Owner-only: permanently delete an order (its line items cascade).
 * For audit-friendly cancellation, use POST /api/orders/[id]/void instead.
 */
export async function DELETE(_request: Request, { params }: RouteContext) {
  const guard = await requireApp(["owner"]);
  if (!guard.ok) return guard.response;
  const { ownerId } = guard;

  const id = parseId((await params).id);
  if (!id) return jsonError("NOT_FOUND", 404);

  const [deleted] = await db
    .delete(orders)
    .where(and(eq(orders.id, id), eq(orders.userId, ownerId)))
    .returning({ id: orders.id });
  if (!deleted) return jsonError("NOT_FOUND", 404);

  return NextResponse.json({ ok: true });
}
