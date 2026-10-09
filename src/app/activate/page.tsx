import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { accessState, isAdmin } from "@/lib/access";
import { staffHome } from "@/lib/page-guards";
import { ActivateView } from "@/components/activate/activate-view";

export const metadata = { title: "Activate" };

export default async function ActivatePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.type === "staff") redirect(staffHome(session.staff.role));

  const user = session.user;
  if (isAdmin(user)) redirect("/admin");

  const state = accessState(user);
  if (state === "active" || state === "admin") redirect("/dashboard");

  return <ActivateView state={state} name={user.name} shopName={user.shopName} />;
}
