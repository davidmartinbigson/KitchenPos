import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jsonError, requireUser } from "@/lib/api";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { ensureBranchSchema, getBranchRow, mainOwnerIdOf } from "@/lib/branches";

/**
 * Branch hopping: verify the target belongs to the same family, then re-sign the
 * session cookie with the target's user id. Every existing API just works —
 * none of them ever knew a branch exists.
 */
export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;
  await ensureBranchSchema();

  const body = (await request.json().catch(() => ({}))) as { targetId?: number };
  const targetId = Number(body.targetId);
  if (!Number.isInteger(targetId) || targetId <= 0) return jsonError("REQUIRED", 400);
  if (targetId === user.id) return NextResponse.json({ ok: true, shopName: user.shopName });

  const mainId = await mainOwnerIdOf(user.id);
  const target = await getBranchRow(targetId);
  if (!target || (targetId !== mainId && target.parentOwnerId !== mainId)) {
    return jsonError("FORBIDDEN", 403);
  }
  if (target.suspended) return jsonError("BRANCH_SUSPENDED", 403);

  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(targetId), sessionCookieOptions);
  return NextResponse.json({ ok: true, shopName: target.shopName });
}
