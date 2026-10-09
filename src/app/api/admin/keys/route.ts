import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { licenseKeys, users } from "@/db/schema";
import { jsonError, requireAdmin } from "@/lib/api";
import { PLAN_DURATIONS, generateLicenseCode } from "@/lib/access";

export async function GET() {
  const { user, response } = await requireAdmin();
  if (!user) return response;

  const keys = await db
    .select({
      id: licenseKeys.id,
      code: licenseKeys.code,
      plan: licenseKeys.plan,
      durationDays: licenseKeys.durationDays,
      note: licenseKeys.note,
      revoked: licenseKeys.revoked,
      redeemedAt: licenseKeys.redeemedAt,
      createdAt: licenseKeys.createdAt,
      redeemedByEmail: users.email,
      redeemedByShop: users.shopName,
    })
    .from(licenseKeys)
    .leftJoin(users, eq(licenseKeys.redeemedByUserId, users.id))
    .orderBy(desc(licenseKeys.createdAt))
    .limit(500);

  return NextResponse.json({ keys });
}

/** Generate one or more unique keys for a plan. */
export async function POST(request: Request) {
  const { user, response } = await requireAdmin();
  if (!user) return response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("REQUIRED", 400);
  }

  const plan = String(body.plan ?? "monthly");
  const quantity = Math.min(Math.max(Math.round(Number(body.quantity ?? 1)) || 1, 1), 100);
  const note = String(body.note ?? "").trim().slice(0, 200);

  let durationDays = PLAN_DURATIONS[plan];
  if (plan === "custom") {
    durationDays = Math.round(Number(body.durationDays));
  }
  if (!Number.isFinite(durationDays) || durationDays < 1 || durationDays > 36500) {
    return jsonError("INVALID_DURATION", 400);
  }

  const values = Array.from({ length: quantity }, () => ({
    code: generateLicenseCode(),
    plan,
    durationDays,
    note,
  }));

  const keys = await db.insert(licenseKeys).values(values).returning();
  return NextResponse.json({ keys }, { status: 201 });
}
