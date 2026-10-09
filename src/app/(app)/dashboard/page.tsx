import { requireOwnerPage } from "@/lib/page-guards";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireOwnerPage();
  return <DashboardView currency={user.currency} shopName={user.shopName} />;
}
