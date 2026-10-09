import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { menuItems } from "@/db/schema";
import { jsonError, parseId, requireActiveUser } from "@/lib/api";

const MAX_IMAGE_LENGTH = 900_000;

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const { user, response } = await requireActiveUser();
  if (!user) return response;

  const id = parseId((await params).id);
  if (!id) return jsonError("NOT_FOUND", 404);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("REQUIRED", 400);
  }

  const updates: Partial<typeof menuItems.$inferInsert> = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return jsonError("NAME_PRICE_REQUIRED", 400);
    updates.name = name.slice(0, 120);
  }
  if (body.price !== undefined) {
    const price = Math.round(Number(body.price));
    if (!Number.isFinite(price) || price < 0) return jsonError("NAME_PRICE_REQUIRED", 400);
    updates.price = price;
  }
  if (body.category !== undefined) {
    updates.category = String(body.category).trim().slice(0, 60) || "General";
  }
  if (body.description !== undefined) {
    updates.description = String(body.description).trim().slice(0, 400);
  }
  if (body.emoji !== undefined) {
    updates.emoji = String(body.emoji).trim().slice(0, 8) || "🍽️";
  }
  if (body.available !== undefined) {
    updates.available = Boolean(body.available);
  }
  if (body.imageData !== undefined) {
    if (body.imageData === null || body.imageData === "") {
      updates.imageData = null;
    } else if (
      typeof body.imageData === "string" &&
      body.imageData.startsWith("data:image/") &&
      body.imageData.length <= MAX_IMAGE_LENGTH
    ) {
      updates.imageData = body.imageData;
    } else {
      return jsonError("IMAGE_INVALID", 400);
    }
  }

  const [item] = await db
    .update(menuItems)
    .set(updates)
    .where(and(eq(menuItems.id, id), eq(menuItems.userId, user.id)))
    .returning();

  if (!item) return jsonError("NOT_FOUND", 404);
  return NextResponse.json({ item });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { user, response } = await requireActiveUser();
  if (!user) return response;

  const id = parseId((await params).id);
  if (!id) return jsonError("NOT_FOUND", 404);

  const deleted = await db
    .delete(menuItems)
    .where(and(eq(menuItems.id, id), eq(menuItems.userId, user.id)))
    .returning({ id: menuItems.id });

  if (deleted.length === 0) return jsonError("NOT_FOUND", 404);
  return NextResponse.json({ ok: true });
}
