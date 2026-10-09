import { NextResponse } from "next/server";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { passwordResets, staff, users } from "@/db/schema";
import { jsonError } from "@/lib/api";
import { hashPassword } from "@/lib/auth";

/** POST { token, password } — complete a password reset. */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("REQUIRED", 400);
  }

  const token = String(body.token ?? "").trim();
  const password = String(body.password ?? "");
  if (!token) return jsonError("REQUIRED", 400);
  if (password.length < 6) return jsonError("PASSWORD_SHORT", 400);

  const [reset] = await db
    .select()
    .from(passwordResets)
    .where(
      and(
        eq(passwordResets.token, token),
        isNull(passwordResets.usedAt),
        gt(passwordResets.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!reset) return jsonError("RESET_INVALID", 400);

  const passwordHash = await hashPassword(password);

  const [owner] = await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.email, reset.email))
    .returning({ id: users.id });

  if (!owner) {
    const [member] = await db
      .update(staff)
      .set({ passwordHash })
      .where(eq(staff.email, reset.email))
      .returning({ id: staff.id });
    if (!member) return jsonError("RESET_INVALID", 400);
  }

  await db.update(passwordResets).set({ usedAt: new Date() }).where(eq(passwordResets.id, reset.id));

  return NextResponse.json({ ok: true });
}
