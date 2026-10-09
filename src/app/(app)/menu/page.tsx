import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { menuItems } from "@/db/schema";
import { requireOwnerPage } from "@/lib/page-guards";
import type { MenuItemDTO } from "@/lib/types";
import { MenuManager } from "@/components/menu/menu-manager";

export const metadata = { title: "Menu & Items" };

export default async function MenuPage() {
  const user = await requireOwnerPage();

  const items: MenuItemDTO[] = await db
    .select({
      id: menuItems.id,
      name: menuItems.name,
      category: menuItems.category,
      description: menuItems.description,
      price: menuItems.price,
      imageData: menuItems.imageData,
      emoji: menuItems.emoji,
      available: menuItems.available,
    })
    .from(menuItems)
    .where(eq(menuItems.userId, user.id))
    .orderBy(asc(menuItems.category), asc(menuItems.name));

  return <MenuManager initialItems={items} currency={user.currency} />;
}
