import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { parseId } from "@/lib/api";
import { accessState } from "@/lib/access";
import { parseAddons } from "@/lib/addons";
import { TrackClient } from "@/components/track/track-client";

export const dynamic = "force-dynamic";

type PageArgs = { params: Promise<{ id: string; order: string }> };

export async function generateMetadata({ params }: PageArgs): Promise<Metadata> {
  const { id } = await params;
  const restaurant = await db.query.users.findFirst({ where: eq(users.id, Number(id) || 0) });
  return { title: restaurant ? `Track order — ${restaurant.shopName}` : "Track order" };
}

export default async function TrackOrderPage({ params }: PageArgs) {
  const { id, order } = await params;
  const userId = parseId(id);
  const orderNumber = parseId(order);
  if (!userId || !orderNumber) notFound();

  const restaurant = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!restaurant) notFound();
  if (accessState(restaurant) !== "active") notFound();
  if (parseAddons(restaurant.addons).guestTracking !== true) notFound();

  return <TrackClient restaurantId={userId} orderNumber={orderNumber} />;
}
