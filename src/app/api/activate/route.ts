import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { licenseKeys, users } from "@/db/schema";
import { jsonError, requireUser } from "@/lib/api";
import { accessState, daysLeft, isAdmin, normalizeCode } from "@/lib/access";

/** Current subscription status of the logged-in shop owner. */
export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;

  return NextResponse.json({
    state: accessState(user),
    accessExpiresAt: user.accessExpiresAt,
    daysLeft: daysLeft(user.accessExpiresAt),
    suspended: user.suspended,
  });
}

/** Redeem a license key: extends access by the key's duration. */
export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;
  if (isAdmin(user)) return jsonError("ALREADY_ADMIN", 400);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("REQUIRED", 400);
  }

  const code = normalizeCode(String(body.code ?? ""));
  if (!code) return jsonError("REQUIRED", 400);

  try {
    const result = await db.transaction(async (tx) => {
      // Claim the key atomically: only succeeds if unused and not revoked.
      const claimed = await tx
        .update(licenseKeys)
        .set({ redeemedByUserId: user.id, redeemedAt: new Date() })
        .where(
          and(
            eq(licenseKeys.code, code),
            eq(licenseKeys.revoked, false),
            isNull(licenseKeys.redeemedByUserId),
          ),
        )
        .returning();

      if (claimed.length === 0) {
        const [found] = await tx
          .select({ revoked: licenseKeys.revoked, redeemedBy: licenseKeys.redeemedByUserId })
          .from(licenseKeys)
          .where(eq(licenseKeys.code, code))
          .limit(1);
        if (!found) throw new Error("KEY_NOT_FOUND");
        if (found.revoked) throw new Error("KEY_REVOKED");
        throw new Error("KEY_USED");
      }

      const key = claimed[0];
      // Extend from the later of "now" or the current expiry, so stacking keys works.
      const base =
        user.accessExpiresAt && new Date(user.accessExpiresAt).getTime() > Date.now()
          ? new Date(user.accessExpiresAt)
          : new Date();
      const expires = new Date(base.getTime() + key.durationDays * 86_400_000);

      await tx
        .update(users)
        .set({ accessExpiresAt: expires, suspended: false })
        .where(eq(users.id, user.id));

      return { expires, plan: key.plan, durationDays: key.durationDays };
    });

    return NextResponse.json({
      ok: true,
      accessExpiresAt: result.expires,
      plan: result.plan,
      daysLeft: daysLeft(result.expires),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (["KEY_NOT_FOUND", "KEY_REVOKED", "KEY_USED"].includes(code)) {
      return jsonError(code, 400);
    }
    throw error;
  }
}
