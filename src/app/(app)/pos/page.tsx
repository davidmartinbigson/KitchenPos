import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { menuItems, users } from "@/db/schema";
import { requirePosScope } from "@/lib/page-guards";
import { ensureSortOrderColumn } from "@/lib/menu-sort-ensure";
import type { MenuItemDTO } from "@/lib/types";
import { parseAddons } from "@/lib/addons";
import { normalizePaymentMethods } from "@/lib/payment-methods";
import { PosTerminal } from "@/components/pos/pos-terminal";

export const metadata = { title: "Point of Sale" };

export default async function PosPage() {
  const scope = await requirePosScope();

  const [ownerRow] = await db
    .select({
      addons: users.addons,
      taxRate: users.taxRate,
      paymentMethods: users.paymentMethods,
      receiptHeader: users.receiptHeader,
      receiptFooter: users.receiptFooter,
      receiptLogo: users.receiptLogo,
      receiptSize: users.receiptSize,
      slug: users.slug,
      country: users.country,
    })
    .from(users)
    .where(eq(users.id, scope.ownerId));

  await ensureSortOrderColumn();
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
    .orderBy(asc(menuItems.sortOrder), asc(menuItems.id));

  const items: MenuItemDTO[] = rows;

  return (
    <PosTerminal
      initialItems={items}
      currency={scope.currency}
      shopName={scope.shopName}
      sellerName={scope.sellerName}
      readOnly={scope.type === "staff"}
      addons={parseAddons(ownerRow?.addons)}
      taxRate={ownerRow?.taxRate ?? 0}
      paymentMethods={normalizePaymentMethods(ownerRow?.paymentMethods)}
      branding={{
        logo: ownerRow?.receiptLogo ?? "",
        header: ownerRow?.receiptHeader ?? "",
        footer: ownerRow?.receiptFooter ?? "",
        size: ownerRow?.receiptSize ?? "80",
      }}
      menuUrl={ownerRow?.slug ? `/menu/${ownerRow.slug}` : `/r/${scope.ownerId}`}
      country={ownerRow?.country ?? ""}
    />
  );
}
