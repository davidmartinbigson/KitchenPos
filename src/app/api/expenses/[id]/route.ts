import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { jsonError, parseId, requireApp } from "@/lib/api";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: RouteContext) {
  const guard = await requireApp(["owner"]);
  if (!guard.ok) return guard.response;
  const { ownerId } = guard;

  const id = parseId((await params).id);
  if (!id) return jsonError("NOT_FOUND", 404);

  await db.delete(expenses).where(and(eq(expenses.id, id), eq(expenses.userId, ownerId)));
  return NextResponse.json({ ok: true });
}
