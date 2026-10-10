import { requireOwnerPage } from "@/lib/page-guards";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { QrMenuCard } from "@/components/qr-menu/qr-card";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireOwnerPage();
  return (
    <div className="space-y-6">
      <DashboardView currency={user.currency} shopName={user.shopName} />
      <QrMenuCard restaurantId={user.id} shopName={user.shopName} />
    </div>
  );
}
