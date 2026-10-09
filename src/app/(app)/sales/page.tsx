import { requireOwnerPage } from "@/lib/page-guards";
import { SalesView } from "@/components/sales/sales-view";

export const metadata = { title: "Sales" };

export default async function SalesPage() {
  const user = await requireOwnerPage();
  return <SalesView currency={user.currency} />;
}
