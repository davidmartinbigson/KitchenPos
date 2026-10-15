import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { menuItems, users } from "@/db/schema";
import { accessState } from "@/lib/access";
import { parseAddons } from "@/lib/addons";
import { isValidSlugParam } from "@/lib/slug";
import { QR_MENU_STRINGS } from "@/lib/qr-public";
import { QrMenuClient } from "@/components/qr-menu/qr-menu-client";
import { parseMenuTheme } from "@/lib/menu-theme";

export const dynamic = "force-dynamic";

/**
 * Vanity public menu: /menu/<slug> (e.g. /menu/azure-coffee-12).
 * This is the shareable link shown on the QR card; the legacy /r/<id>
 * URLs printed on old table cards keep working unchanged.
 */
type PageArgs = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

async function findRestaurant(slug: string) {
  if (!isValidSlugParam(slug)) return null;
  return db.query.users.findFirst({ where: eq(users.slug, slug) });
}

export async function generateMetadata({ params }: PageArgs): Promise<Metadata> {
  const restaurant = await findRestaurant((await params).slug);
  return { title: restaurant ? `${restaurant.shopName} — Menu` : "Menu" };
}

export default async function VanityMenuPage({ params, searchParams }: PageArgs) {
  const restaurant = await findRestaurant((await params).slug);
  if (!restaurant) notFound();

  const userId = restaurant.id;
  const sp = await searchParams;
  const tableRaw = String(sp.table ?? "").trim();
  const tableN = Number(tableRaw);
  const tableLabel = tableRaw && Number.isInteger(tableN) && tableN >= 1 && tableN <= 200 ? tableN : null;

  const active = accessState(restaurant) === "active";
  const items = active
    ? await db.query.menuItems.findMany({
        where: and(eq(menuItems.userId, userId), eq(menuItems.available, true)),
        orderBy: [asc(menuItems.category), asc(menuItems.name)],
      })
    : [];

  return (
    <QrMenuClient
      menuTheme={parseMenuTheme((restaurant as { menuTheme?: unknown }).menuTheme)}
      restaurantId={userId}
      shopName={restaurant.shopName}
      currency={restaurant.currency}
      active={active}
      tablePrefill={tableLabel ? `${QR_MENU_STRINGS.table} ${tableLabel}` : ""}
      guestTracking={parseAddons(restaurant.addons).guestTracking === true}
      paymentProof={parseAddons(restaurant.addons).paymentProof === true}
      items={items.map((i) => ({
        id: i.id,
        name: i.name,
        category: i.category,
        price: i.price,
        emoji: i.emoji,
        imageData: i.imageData,
        extras: (i.extras as { name: string; price: number }[]) ?? [],
        stockQty: i.stockQty,
      }))}
    />
  );
}
