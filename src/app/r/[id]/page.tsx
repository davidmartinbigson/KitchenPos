import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { menuItems, users } from "@/db/schema";
import { accessState } from "@/lib/access";
import { parseId } from "@/lib/api";
import { QrMenuClient } from "@/components/qr-menu/qr-menu-client";

export const dynamic = "force-dynamic";

type PageArgs = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageArgs): Promise<Metadata> {
  const { id } = await params;
  const restaurant = await db.query.users.findFirst({ where: eq(users.id, Number(id) || 0) });
  return { title: restaurant ? `${restaurant.shopName} — Menu` : "Menu" };
}

export default async function QrMenuPage({ params }: PageArgs) {
  const userId = parseId((await params).id);
  if (!userId) notFound();

  const restaurant = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!restaurant) notFound();

  const active = accessState(restaurant) === "active";
  const items = active
    ? await db.query.menuItems.findMany({
        where: and(eq(menuItems.userId, userId), eq(menuItems.available, true)),
        orderBy: [asc(menuItems.category), asc(menuItems.name)],
      })
    : [];

  return (
    <QrMenuClient
      restaurantId={userId}
      shopName={restaurant.shopName}
      currency={restaurant.currency}
      active={active}
      items={items.map((i) => ({
        id: i.id,
        name: i.name,
        category: i.category,
        price: i.price,
        emoji: i.emoji,
        imageData: i.imageData,
      }))}
    />
  );
}
