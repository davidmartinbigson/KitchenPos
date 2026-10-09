import { NextResponse } from "next/server";
import { count, desc, ne } from "drizzle-orm";
import { db } from "@/db";
import { orders, users } from "@/db/schema";
import { requireAdmin } from "@/lib/api";
import { isOnline } from "@/lib/presence";

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

  const [totals] = await db
    .select({
      customers: count(users.id).mapWith(Number),
    })
    .from(users)
    .where(ne(users.role, "admin"));

  const [platform] = await db
    .select({ orders: count(orders.id).mapWith(Number) })
    .from(orders);

  const customers = rows.map((r) => ({ ...r, online: isOnline(r.lastSeenAt) }));

  return NextResponse.json({
    customers,
    summary: {
      customers: totals?.customers ?? 0,
      active: rows.filter(
        (r) => !r.suspended && r.accessExpiresAt && new Date(r.accessExpiresAt).getTime() > Date.now(),
      ).length,
      online: customers.filter((c) => c.online).length,
      offline: customers.length - customers.filter((c) => c.online).length,
      orders: platform?.orders ?? 0,
    },
  });
}
