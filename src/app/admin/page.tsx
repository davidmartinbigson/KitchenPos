import { getCurrentUser } from "@/lib/auth";
import { AdminPanel } from "@/components/admin/admin-panel";

export default async function AdminPage() {
  const user = await getCurrentUser();
  return <AdminPanel adminName={user?.name ?? "Admin"} adminEmail={user?.email ?? ""} />;
}
