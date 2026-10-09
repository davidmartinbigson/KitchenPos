import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSession } from "@/lib/auth";
import { accessState, daysLeft, isAdmin } from "@/lib/access";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.type === "staff") {
    const member = session.staff;
    if (member.role === "chef") redirect("/kitchen");
    if (!session.ownerActive) redirect("/login");
    // Cashier inside the app shell: POS only.
    return (
      <AppShell
        user={{
          kind: "staff",
          name: member.name,
          role: member.role,
          shopName: session.owner.shopName,
        }}
      >
        {children}
      </AppShell>
    );
  }

  const user = session.user;
  if (isAdmin(user)) redirect("/admin");

  const state = accessState(user);
  if (state !== "active") redirect("/activate");

  return (
    <AppShell
      user={{
        kind: "owner",
        name: user.name,
        email: user.email,
        shopName: user.shopName,
        daysLeft: daysLeft(user.accessExpiresAt),
        accessExpiresAt: user.accessExpiresAt ? user.accessExpiresAt.toISOString() : null,
      }}
    >
      {children}
    </AppShell>
  );
}
