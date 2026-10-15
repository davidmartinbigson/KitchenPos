import { requireKitchenScope } from "@/lib/page-guards";
import { KitchenDisplay } from "@/components/kitchen/kitchen-display";
import { KitchenOffScreen } from "@/components/kitchen/kitchen-off-screen";
import { addonEnabled } from "@/lib/addons";

export const metadata = { title: "Kitchen Display" };

export default async function KitchenPage() {
  const scope = await requireKitchenScope();
  if (!addonEnabled(scope.addons, "kitchenDisplay")) {
    return <KitchenOffScreen isOwner={scope.viewerRole === "owner"} shopName={scope.shopName} />;
  }
  return (
    <KitchenDisplay
      viewerRole={scope.viewerRole}
      viewerName={scope.viewerName}
      categories={scope.categories}
      shopName={scope.shopName}
    />
  );
}
