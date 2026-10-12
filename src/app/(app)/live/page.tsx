import { requireOwnerPage } from "@/lib/page-guards";
import { LiveView } from "@/components/live/live-view";

export const metadata = { title: "Live" };

export default async function LivePage() {
  const user = await requireOwnerPage({ ownerOnly: true });
  return <LiveView currency={user.currency} />;
}
