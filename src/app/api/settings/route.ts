import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { jsonError, requireUser } from "@/lib/api";
import { isLang } from "@/lib/i18n";

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
  if (body.language !== undefined) {
    if (!isLang(body.language)) return jsonError("INVALID_LANGUAGE", 400);
    updates.language = body.language;
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
      language: users.language,
    });

  return NextResponse.json({ user: updated });
}
