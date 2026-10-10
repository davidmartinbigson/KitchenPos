import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { menuItems, users } from "@/db/schema";
import { requirePosScope } from "@/lib/page-guards";
import type { MenuItemDTO } from "@/lib/types";
import { parseAddons } from "@/lib/addons";
import { PosTerminal } from "@/components/pos/pos-terminal";

export const metadata = { title: "Point of Sale" };

export default async function PosPage() {
  const scope = await requirePosScope();

  const [ownerRow] = await db
    .select({ addons: users.addons })
    .from(users)
    .where(eq(users.id, scope.ownerId));

  const rows = await db
    .select({
      id: menuItems.id,
      name: menuItems.name,
      category: menuItems.category,
      description: menuItems.description,
      price: menuItems.price,
      imageData: menuItems.imageData,
      emoji: menuItems.emoji,
      available: menuItems.available,
      stockQty: menuItems.stockQty,
    })
    .from(menuItems)
    .where(eq(menuItems.userId, scope.ownerId))
    .orderBy(asc(menuItems.category), asc(menuItems.name));

  const items: MenuItemDTO[] = rows;

  return (
    <PosTerminal
      initialItems={items}
      currency={scope.currency}
      shopName={scope.shopName}
      sellerName={scope.sellerName}
      readOnly={scope.type === "staff"}
      addons={parseAddons(ownerRow?.addons)}
    />
  );
}
