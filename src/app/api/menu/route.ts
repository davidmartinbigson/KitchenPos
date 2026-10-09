import { NextResponse } from "next/server";
import { asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { menuItems } from "@/db/schema";
import { jsonError, requireActiveUser, requireApp } from "@/lib/api";

const MAX_IMAGE_LENGTH = 900_000; // ~650KB base64 JPEG

export async function GET() {
  // Cashiers read the menu for the POS screen; chefs use the kitchen feed.
  const guard = await requireApp(["owner", "cashier"]);
  if (!guard.ok) return guard.response;
  const ownerId = guard.ownerId;

  const items = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.userId, ownerId))
    .orderBy(asc(menuItems.category), asc(menuItems.name));

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const { user, response } = await requireActiveUser();
  if (!user) return response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("REQUIRED", 400);
  }

  const name = String(body.name ?? "").trim();
  const price = Math.round(Number(body.price));
  if (!name || !Number.isFinite(price) || price < 0) return jsonError("NAME_PRICE_REQUIRED", 400);

  const imageData = typeof body.imageData === "string" && body.imageData ? body.imageData : null;
  if (imageData && (!imageData.startsWith("data:image/") || imageData.length > MAX_IMAGE_LENGTH)) {
    return jsonError("IMAGE_INVALID", 400);
  }

  // Per-restaurant menu item limit (default 500; the master admin can raise it).
  const [{ total }] = await db
    .select({ total: count(menuItems.id).mapWith(Number) })
    .from(menuItems)
    .where(eq(menuItems.userId, user.id));
  if (total >= user.itemLimit) {
    return NextResponse.json({ error: "ITEM_LIMIT", limit: user.itemLimit }, { status: 403 });
  }

  const [item] = await db
    .insert(menuItems)
    .values({
      userId: user.id,
      name: name.slice(0, 120),
      category: String(body.category ?? "").trim().slice(0, 60) || "General",
      description: String(body.description ?? "").trim().slice(0, 400),
      price,
      imageData,
      emoji: String(body.emoji ?? "").trim().slice(0, 8) || "🍽️",
      available: body.available === false ? false : true,
    })
    .returning();

  return NextResponse.json({ item }, { status: 201 });
}
