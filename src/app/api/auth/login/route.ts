import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  SESSION_COOKIE,
  createSessionToken,
  createStaffToken,
  sessionCookieOptions,
  verifyPassword,
} from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { MASTER_ADMIN_EMAIL, ensureMasterAdmin } from "@/lib/access";
import { staff } from "@/db/schema";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("REQUIRED", 400);
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!email || !password) return jsonError("REQUIRED", 400);

  // Make sure the master admin account exists before the first admin login.
  if (email === MASTER_ADMIN_EMAIL) {
    await ensureMasterAdmin();
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  // Staff fallback: chefs & cashiers log in through the same form.
  if (!user) {
    const [member] = await db.select().from(staff).where(eq(staff.email, email)).limit(1);
    if (!member || !member.active) return jsonError("INVALID_CREDENTIALS", 401);

    const staffValid = await verifyPassword(password, member.passwordHash);
    if (!staffValid) return jsonError("INVALID_CREDENTIALS", 401);

    const [owner] = await db
      .select({ role: users.role, suspended: users.suspended, accessExpiresAt: users.accessExpiresAt })
      .from(users)
      .where(eq(users.id, member.ownerId))
      .limit(1);
    const ownerActive =
      owner &&
      owner.role !== "admin" &&
      !owner.suspended &&
      owner.accessExpiresAt &&
      new Date(owner.accessExpiresAt).getTime() > Date.now();
    if (!ownerActive) return jsonError("OWNER_INACTIVE", 403);

    const staffResponse = NextResponse.json({
      staff: true,
      role: member.role,
      name: member.name,
    });
    staffResponse.cookies.set(SESSION_COOKIE, createStaffToken(member.id), sessionCookieOptions);
    return staffResponse;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return jsonError("INVALID_CREDENTIALS", 401);

  const response = NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      shopName: user.shopName,
      currency: user.currency,
      language: user.language,
      role: user.role,
    },
  });
  response.cookies.set(SESSION_COOKIE, createSessionToken(user.id), sessionCookieOptions);
  return response;
}
