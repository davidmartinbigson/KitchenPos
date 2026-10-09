import { NextResponse } from "next/server";
import { count, desc, ne, sql, sum } from "drizzle-orm";
import { db } from "@/db";
import { menuItems, orders, users } from "@/db/schema";
import { requireAdmin } from "@/lib/api";

/** All shop owners with their subscription state and usage stats. */
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
      suspended: users.suspended,
      accessExpiresAt: users.accessExpiresAt,
      createdAt: users.createdAt,
      orderCount: sql<number>`(select count(*) from ${orders} where ${orders.userId} = ${users.id})`.mapWith(Number),
      revenue: sql<number>`coalesce((select sum(${orders.total}) from ${orders} where ${orders.userId} = ${users.id}), 0)`.mapWith(Number),
      menuCount: sql<number>`(select count(*) from ${menuItems} where ${menuItems.userId} = ${users.id})`.mapWith(Number),
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
    .select({
      orders: count(orders.id).mapWith(Number),
      revenue: sum(orders.total).mapWith(Number),
    })
    .from(orders);

  return NextResponse.json({
    customers: rows,
    summary: {
      customers: totals?.customers ?? 0,
      active: rows.filter(
        (r) => !r.suspended && r.accessExpiresAt && new Date(r.accessExpiresAt).getTime() > Date.now(),
      ).length,
      orders: platform?.orders ?? 0,
      revenue: platform?.revenue ?? 0,
    },
  });
}
