import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { and, eq, isNull, lt } from "drizzle-orm";
import { db } from "@/db";
import { passwordResets, staff, users } from "@/db/schema";
import { jsonError } from "@/lib/api";
import { sendPasswordResetEmail, smtpConfigured } from "@/lib/mail";

const TOKEN_TTL_MS = 1000 * 60 * 30; // 30 minutes

/**
 * POST { email } — start a password reset for a shop owner or staff login.
 * - With SMTP configured: a reset link is emailed to the address.
 * - Without SMTP: the reset link is returned so it can be shown on screen
 *   (direct mode for self-hosted setups).
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("REQUIRED", 400);
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) return jsonError("INVALID_EMAIL", 400);

  const [account] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  const [member] = account
    ? []
    : await db.select({ id: staff.id }).from(staff).where(eq(staff.email, email)).limit(1);

  if (!account && !member) return jsonError("EMAIL_NOT_FOUND", 404);

  // Invalidate any previous unused tokens for this address.
  await db
    .update(passwordResets)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResets.email, email), isNull(passwordResets.usedAt)));

  const token = randomBytes(24).toString("hex");
  await db
    .delete(passwordResets)
    .where(and(eq(passwordResets.email, email), lt(passwordResets.expiresAt, new Date())));
  await db.insert(passwordResets).values({
    email,
    token,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  });

  const origin = new URL(request.url).origin;
  const resetUrl = `${origin}/reset-password?token=${token}`;

  let emailed = false;
  if (smtpConfigured()) {
    try {
      emailed = await sendPasswordResetEmail(email, resetUrl);
    } catch {
      emailed = false;
    }
  }

  return NextResponse.json({
    ok: true,
    emailed,
    // Direct mode: no mail server → return the link so the UI can display it.
    resetUrl: emailed ? undefined : resetUrl,
  });
}
