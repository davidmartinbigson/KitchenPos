import { requireKitchenScope } from "@/lib/page-guards";
import { KitchenDisplay } from "@/components/kitchen/kitchen-display";

export const metadata = { title: "Kitchen Display" };

export default async function KitchenPage() {
  const scope = await requireKitchenScope();
  return (
    <KitchenDisplay
      viewerRole={scope.viewerRole}
      viewerName={scope.viewerName}
      categories={scope.categories}
      shopName={scope.shopName}
    />
  );
}
