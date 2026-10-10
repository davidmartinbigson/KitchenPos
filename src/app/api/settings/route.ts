import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { jsonError, requireUser } from "@/lib/api";
import { isLang } from "@/lib/i18n";
import { currencyForCountry, isCountryCode } from "@/lib/countries";
import { mergeAddons } from "@/lib/addons";

export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;
  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("REQUIRED", 400);
  }

  const updates: Partial<typeof users.$inferInsert> = {};

  if (body.shopName !== undefined) {
    const shopName = String(body.shopName).trim();
    if (!shopName) return jsonError("REQUIRED", 400);
    updates.shopName = shopName.slice(0, 120);
  }
  if (body.currency !== undefined) {
    const currency = String(body.currency).trim().slice(0, 8);
    if (!currency) return jsonError("REQUIRED", 400);
    updates.currency = currency;
  }
  if (body.country !== undefined) {
    if (!isCountryCode(body.country)) return jsonError("INVALID_COUNTRY", 400);
    updates.country = String(body.country);
    // Changing country auto-updates the symbol unless one was sent explicitly.
    if (body.currency === undefined) updates.currency = currencyForCountry(String(body.country));
  }
  if (body.dailyOrderReset !== undefined) {
    updates.dailyOrderReset = Boolean(body.dailyOrderReset);
  }
  if (body.tableCount !== undefined) {
    const n = Math.round(Number(body.tableCount));
    if (Number.isFinite(n)) updates.tableCount = Math.min(60, Math.max(2, n));
  }
  if (body.addons !== undefined) {
    const [row] = await db.select({ addons: users.addons }).from(users).where(eq(users.id, user.id));
    updates.addons = mergeAddons(row?.addons, body.addons);
  }
  if (body.language !== undefined) {
    if (!isLang(body.language)) return jsonError("INVALID_LANGUAGE", 400);
    updates.language = body.language;
  }

  // Receipt branding add-on fields — only honoured while the add-on is on.
  const effAddons =
    (updates.addons as Record<string, unknown> | undefined) ?? (user.addons as Record<string, unknown> | null) ?? {};
  if (effAddons.receiptBrand === true) {
    if (body.receiptHeader !== undefined) updates.receiptHeader = String(body.receiptHeader).slice(0, 160);
    if (body.receiptFooter !== undefined) updates.receiptFooter = String(body.receiptFooter).slice(0, 160);
    if (body.receiptLogo !== undefined) {
      const v = String(body.receiptLogo);
      if (v === "" ) updates.receiptLogo = null;
      else if (v.startsWith("data:image/") && v.length < 400_000) updates.receiptLogo = v;
    }
    if (body.receiptSize !== undefined) {
      const v = String(body.receiptSize);
      if (v === "58" || v === "80") updates.receiptSize = v;
    }
  }

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, user.id))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      shopName: users.shopName,
      currency: users.currency,
      country: users.country,
      language: users.language,
      dailyOrderReset: users.dailyOrderReset,
      addons: users.addons,
      tableCount: users.tableCount,
      receiptHeader: users.receiptHeader,
      receiptFooter: users.receiptFooter,
      receiptLogo: users.receiptLogo,
      receiptSize: users.receiptSize,
    });

  return NextResponse.json({ user: updated });
}
