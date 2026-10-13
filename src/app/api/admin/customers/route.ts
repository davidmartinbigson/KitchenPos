import { NextResponse } from "next/server";
import { count, desc, ne } from "drizzle-orm";
import { db, pool } from "@/db";
import { orders, users } from "@/db/schema";
import { requireAdmin } from "@/lib/api";
import { isOnline } from "@/lib/presence";
import { ensureBranchSchema, type BranchRow } from "@/lib/branches";
import { ensureStaffLimitColumn } from "@/lib/quota";

/**
 * All shop owners with their subscription state and LIVE presence.
 * For privacy, customer sales data (orders, revenue, menu counts) is NOT
 * exposed to the master admin — only identity, status and presence.
 */
export async function GET() {
  const { user, response } = await requireAdmin();
  if (!user) return response;

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      shopName: users.shopName,
      currency: users.currency,
      country: users.country,
      suspended: users.suspended,
      accessExpiresAt: users.accessExpiresAt,
      itemLimit: users.itemLimit,
      lastSeenAt: users.lastSeenAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(ne(users.role, "admin"))
    .orderBy(desc(users.createdAt));

  const [platform] = await db
    .select({ orders: count(orders.id).mapWith(Number) })
    .from(orders);

  // Multi-branch: attach each main account's branch children (identity/status only)
  // and keep branch rows OUT of the top-level customer list.
  type ChildCard = { id: number; shopName: string; suspended: boolean; online: boolean; createdAt: Date };
  const childrenByParent = new Map<number, ChildCard[]>();
  const childIds = new Set<number>();
  const branchLimitById = new Map<number, number>();
  try {
    await ensureBranchSchema();
    const { rows: kids } = await pool.query<BranchRow>(
      'SELECT id, shop_name AS "shopName", suspended, last_seen_at AS "lastSeenAt", created_at AS "createdAt", parent_owner_id AS "parentOwnerId" FROM users WHERE parent_owner_id IS NOT NULL ORDER BY created_at',
    );
    for (const k of kids) {
      if (k.parentOwnerId == null) continue;
      childIds.add(k.id);
      const list = childrenByParent.get(k.parentOwnerId) ?? [];
      list.push({
        id: k.id,
        shopName: k.shopName,
        suspended: k.suspended,
        online: isOnline(k.lastSeenAt),
        createdAt: k.createdAt,
      });
      childrenByParent.set(k.parentOwnerId, list);
    }
    const { rows: limits } = await pool.query<{ id: number; branchLimit: number }>(
      'SELECT id, branch_limit AS "branchLimit" FROM users WHERE role != \'admin\'',
    );
    for (const l of limits) branchLimitById.set(l.id, l.branchLimit);
  } catch {
    /* branch columns not migrated yet → plain customer list, same as before */
  }

  const staffLimitById = new Map<number, number>();
  const staffUsedByOwner = new Map<number, number>();
  try {
    await ensureStaffLimitColumn();
    const { rows: lims } = await pool.query<{ id: number; staffLimit: number }>(
      'SELECT id, staff_limit AS "staffLimit" FROM users WHERE role != \'admin\'',
    );
    for (const l of lims) staffLimitById.set(l.id, l.staffLimit);
    const { rows: cnt } = await pool.query<{ ownerId: number; used: number }>(
      'SELECT owner_id AS "ownerId", count(*)::int AS used FROM staff GROUP BY owner_id',
    );
    for (const c of cnt) staffUsedByOwner.set(c.ownerId, c.used);
  } catch {
    /* staff_limit column not migrated yet */
  }

  const customers = rows
    .filter((r) => !childIds.has(r.id))
    .map((r) => ({
      ...r,
      online: isOnline(r.lastSeenAt),
      branchLimit: branchLimitById.get(r.id) ?? 1,
      staffLimit: staffLimitById.get(r.id) ?? 3,
      staffUsed: staffUsedByOwner.get(r.id) ?? 0,
      children: childrenByParent.get(r.id) ?? [],
    }));

  return NextResponse.json({
    customers,
    summary: {
      customers: customers.length,
      active: customers.filter(
        (r) => !r.suspended && r.accessExpiresAt && new Date(r.accessExpiresAt).getTime() > Date.now(),
      ).length,
      online: customers.filter((c) => c.online).length,
      offline: customers.length - customers.filter((c) => c.online).length,
      orders: platform?.orders ?? 0,
    },
  });
}
