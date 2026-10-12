import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { jsonError, parseId, requireAdmin } from "@/lib/api";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH actions:
 *  - { action: "suspend" }              cut the customer off immediately
 *  - { action: "resume" }               restore access
 *  - { action: "extend", days: 30 }     add days to the subscription
 *  - { action: "revokeAccess" }         clear the subscription entirely
 *  - { action: "setItemLimit", value }  raise/lower the menu item limit (default 500)
 *  - { action: "extendBranches" }     allow one more child branch (multi-branch add-on)
 */
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

  const [target] = await db
    .select({ id: users.id, accessExpiresAt: users.accessExpiresAt })
    .from(users)
    .where(and(eq(users.id, id), ne(users.role, "admin")))
    .limit(1);
  if (!target) return jsonError("NOT_FOUND", 404);

  const action = String(body.action ?? "");
  const updates: Partial<typeof users.$inferInsert> = {};

  switch (action) {
    case "suspend":
      updates.suspended = true;
      break;
    case "resume":
      updates.suspended = false;
      break;
    case "revokeAccess":
      updates.accessExpiresAt = null;
      updates.suspended = true;
      break;
    case "extend": {
      const days = Math.round(Number(body.days));
      if (!Number.isFinite(days) || days === 0 || Math.abs(days) > 36500) {
        return jsonError("INVALID_DAYS", 400);
      }
      const base =
        target.accessExpiresAt && new Date(target.accessExpiresAt).getTime() > Date.now()
          ? new Date(target.accessExpiresAt)
          : new Date();
      updates.accessExpiresAt = new Date(base.getTime() + days * 86_400_000);
      updates.suspended = false;
      break;
    }
    case "setItemLimit": {
      const value = Math.round(Number(body.value));
      if (!Number.isFinite(value) || value < 1 || value > 100000) {
        return jsonError("INVALID_LIMIT", 400);
      }
      updates.itemLimit = value;
      break;
    }
    case "extendBranches": {
      const [row] = await db
        .select({ branchLimit: users.branchLimit, parentOwnerId: users.parentOwnerId })
        .from(users)
        .where(eq(users.id, id))
        .limit(1)
        .catch(() => [null] as const);
      if (!row) return jsonError("MIGRATION_PENDING", 409);
      if (row.parentOwnerId != null) return jsonError("BRANCH_NOT_MAIN", 400);
      const next = Math.min(50, (row.branchLimit ?? 1) + 1);
      updates.branchLimit = next;
      break;
    }
    default:
      return jsonError("INVALID_ACTION", 400);
  }

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      suspended: users.suspended,
      accessExpiresAt: users.accessExpiresAt,
      itemLimit: users.itemLimit,
    });

  // Subscription extends propagate to every branch of the family.
  if (action === "extend" && updates.accessExpiresAt) {
    try {
      await db
        .update(users)
        .set({ accessExpiresAt: updates.accessExpiresAt })
        .where(eq(users.parentOwnerId, id));
    } catch {
      /* branch columns not migrated yet */
    }
  }

  return NextResponse.json({ customer: { ...updated, branchLimit: action === "extendBranches" ? updates.branchLimit : undefined } });
}

/** Permanently delete a customer and all of their data. */
export async function DELETE(_request: Request, { params }: RouteContext) {
  const { user, response } = await requireAdmin();
  if (!user) return response;

  const id = parseId((await params).id);
  if (!id) return jsonError("NOT_FOUND", 404);

  const deleted = await db
    .delete(users)
    .where(and(eq(users.id, id), ne(users.role, "admin")))
    .returning({ id: users.id });

  if (deleted.length === 0) return jsonError("NOT_FOUND", 404);
  return NextResponse.json({ ok: true });
}
