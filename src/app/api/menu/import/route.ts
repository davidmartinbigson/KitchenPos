import { NextResponse } from "next/server";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { menuItems } from "@/db/schema";
import { jsonError, requireActiveUser } from "@/lib/api";

const MAX_ROWS = 1000;
const MAX_IMAGE_LENGTH = 900_000;

type IncomingRow = {
  name?: unknown;
  category?: unknown;
  description?: unknown;
  price?: unknown;
  emoji?: unknown;
  available?: unknown;
  image?: unknown;
};

function parseAvailable(value: unknown) {
  if (value === undefined || value === null || value === "") return true;
  const s = String(value).trim().toLowerCase();
  return !["no", "false", "0", "n", "off", "unavailable", "نہیں"].includes(s);
}

function parsePrice(value: unknown) {
  // Tolerates "Rs 1,200.00", "1200", "1 200" but rejects "abc" / empty cells.
  const raw = String(value ?? "").trim();
  if (!raw || !/\d/.test(raw)) return NaN;
  const cleaned = raw.replace(/[^\d.-]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? Math.round(num) : NaN;
}

function parseImage(value: unknown) {
  const s = String(value ?? "").trim();
  if (!s) return null;
  if (s.startsWith("data:image/")) return s.length <= MAX_IMAGE_LENGTH ? s : null;
  if (/^https?:\/\//i.test(s) && s.length <= 2000) return s;
  return null;
}

/** Bulk-create menu items from a parsed CSV / Excel sheet. */
export async function POST(request: Request) {
  const { user, response } = await requireActiveUser();
  if (!user) return response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("REQUIRED", 400);
  }

  const rows = Array.isArray(body.rows) ? (body.rows as IncomingRow[]) : [];
  if (rows.length === 0) return jsonError("NO_ROWS", 400);
  if (rows.length > MAX_ROWS) return jsonError("TOO_MANY_ROWS", 400);

  // Per-restaurant menu item limit (default 500; the master admin can raise it).
  const [{ total }] = await db
    .select({ total: count(menuItems.id).mapWith(Number) })
    .from(menuItems)
    .where(eq(menuItems.userId, user.id));
  const remaining = Math.max(0, user.itemLimit - total);
  if (remaining === 0) {
    return NextResponse.json({ error: "ITEM_LIMIT", limit: user.itemLimit }, { status: 403 });
  }

  const parsed: { rowNumber: number; value: typeof menuItems.$inferInsert }[] = [];
  const skipped: { row: number; reason: string }[] = [];

  rows.forEach((row, index) => {
    const name = String(row.name ?? "").trim();
    const price = parsePrice(row.price);
    if (!name) {
      skipped.push({ row: index + 1, reason: "MISSING_NAME" });
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      skipped.push({ row: index + 1, reason: "INVALID_PRICE" });
      return;
    }
    parsed.push({ rowNumber: index + 1, value: {
      userId: user.id,
      name: name.slice(0, 120),
      category: String(row.category ?? "").trim().slice(0, 60) || "General",
      description: String(row.description ?? "").trim().slice(0, 400),
      price,
      emoji: String(row.emoji ?? "").trim().slice(0, 8) || "🍽️",
      available: parseAvailable(row.available),
      imageData: parseImage(row.image),
    } });
  });

  if (parsed.length === 0) {
    return NextResponse.json({ imported: 0, skipped, items: [] }, { status: 400 });
  }

  // Respect the item limit: import what fits, report the rest as skipped.
  const limited = parsed.slice(0, remaining);
  parsed.slice(remaining).forEach((p) => {
    skipped.push({ row: p.rowNumber, reason: "LIMIT" });
  });

  const inserted = await db.insert(menuItems).values(limited.map((p) => p.value)).returning({
    id: menuItems.id,
    name: menuItems.name,
    category: menuItems.category,
    description: menuItems.description,
    price: menuItems.price,
    imageData: menuItems.imageData,
    emoji: menuItems.emoji,
    available: menuItems.available,
  });

  return NextResponse.json({ imported: inserted.length, skipped, items: inserted }, { status: 201 });
}
