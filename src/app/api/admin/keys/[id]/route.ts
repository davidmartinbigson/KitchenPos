import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { licenseKeys } from "@/db/schema";
import { jsonError, parseId, requireAdmin } from "@/lib/api";

type RouteContext = { params: Promise<{ id: string }> };

/** Revoke / un-revoke a key. */
export async function PATCH(request: Request, { params }: RouteContext) {
  const { user, response } = await requireAdmin();
  if (!user) return response;

  const id = parseId((await params).id);
  if (!id) return jsonError("NOT_FOUND", 404);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("REQUIRED", 400);
  }

  const [updated] = await db
    .update(licenseKeys)
    .set({ revoked: Boolean(body.revoked) })
    .where(eq(licenseKeys.id, id))
    .returning({ id: licenseKeys.id, revoked: licenseKeys.revoked });

  if (!updated) return jsonError("NOT_FOUND", 404);
  return NextResponse.json({ key: updated });
}

/** Delete an unused key. */
export async function DELETE(_request: Request, { params }: RouteContext) {
  const { user, response } = await requireAdmin();
  if (!user) return response;

  const id = parseId((await params).id);
  if (!id) return jsonError("NOT_FOUND", 404);

  const deleted = await db
    .delete(licenseKeys)
    .where(eq(licenseKeys.id, id))
    .returning({ id: licenseKeys.id });

  if (deleted.length === 0) return jsonError("NOT_FOUND", 404);
  return NextResponse.json({ ok: true });
}
