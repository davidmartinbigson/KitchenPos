import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSession } from "@/lib/auth";
import { accessState, daysLeft, isAdmin } from "@/lib/access";
import { AppShell } from "@/components/app-shell";
import { parseDashTheme } from "@/lib/dash-theme";
import type { CSSProperties } from "react";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.type === "staff") {
    const member = session.staff;
    if (member.role === "chef") redirect("/kitchen");
    if (!session.ownerActive) redirect("/login");
    // Cashier inside the app shell: POS only.
    return (
      <WithDashTheme raw={(session.owner as { dashTheme?: unknown }).dashTheme}>
        <AppShell
          user={{
            kind: "staff",
            name: member.name,
            role: member.role,
            shopName: session.owner.shopName,
            addons: session.owner.addons as Record<string, unknown>,
          }}
        >
          {children}
        </AppShell>
      </WithDashTheme>
    );
  }

  const user = session.user;
  if (isAdmin(user)) redirect("/admin");

  const state = accessState(user);
  if (state !== "active") redirect("/activate");

  return (
    <WithDashTheme raw={(user as { dashTheme?: unknown }).dashTheme}>
      <AppShell
        user={{
          kind: "owner",
          name: user.name,
          email: user.email,
          shopName: user.shopName,
          daysLeft: daysLeft(user.accessExpiresAt),
          accessExpiresAt: user.accessExpiresAt ? user.accessExpiresAt.toISOString() : null,
          addons: user.addons as Record<string, unknown>,
        }}
      >
        {children}
      </AppShell>
    </WithDashTheme>
  );
}

/** Wraps the workspace in the shop's dashboard-accent scope when enabled. */
function WithDashTheme({ raw, children }: { raw: unknown; children: ReactNode }) {
  const t = parseDashTheme(raw);
  if (!t.enabled) return <>{children}</>;
  return (
    <div
      data-accent
      style={{ "--dash-accent": t.accent, "--dash-tail": t.tail, display: "contents" } as CSSProperties}
    >
      {children}
    </div>
  );
}
