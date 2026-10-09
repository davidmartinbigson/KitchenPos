"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChefHat,
  LayoutDashboard,
  LogOut,
  Settings,
  ShoppingBasket,
  CookingPot,
  TrendingUp,
  Users,
  UtensilsCrossed,
  Menu,
  ShieldCheck,
  X,
  BadgeDollarSign,
} from "lucide-react";
import { useI18n } from "@/components/providers/language-provider";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/components/ui";

/** Pings the server so the restaurant shows "Online" on the master admin. */
function useHeartbeat() {
  useEffect(() => {
    const beat = () => {
      fetch("/api/heartbeat", { method: "POST" }).catch(() => {});
    };
    beat();
    const timer = setInterval(beat, 45_000);
    const onFocus = () => beat();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);
}

export type ShellUser =
  | {
      kind: "owner";
      name: string;
      email: string;
      shopName: string;
      daysLeft: number;
      accessExpiresAt: string | null;
    }
  | { kind: "staff"; name: string; role: string; shopName: string };

const ownerNav = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/pos", key: "pos", icon: ShoppingBasket },
  { href: "/kitchen", key: "kitchen", icon: CookingPot },
  { href: "/menu", key: "menu", icon: UtensilsCrossed },
  { href: "/sales", key: "sales", icon: TrendingUp },
  { href: "/staff", key: "team", icon: Users },
  { href: "/settings", key: "settings", icon: Settings },
] as const;

const cashierNav = [{ href: "/pos", key: "pos", icon: ShoppingBasket }] as const;

const mobileOwnerNav = ownerNav.slice(0, 5);

export function AppShell({ user, children }: { user: ShellUser; children: ReactNode }) {
  const { t, isUrdu } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  useHeartbeat();

  const isOwner = user.kind === "owner";
  const navItems = isOwner ? ownerNav : cashierNav;
  const mobileItems = isOwner ? mobileOwnerNav : cashierNav;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex flex-col gap-1.5">
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-semibold transition-colors",
              active ? "text-white" : "text-slate-600 hover:bg-white hover:text-slate-900",
            )}
          >
            {active && (
              <motion.span
                layoutId="nav-active"
                className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 shadow-lg shadow-orange-500/30"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <Icon className={cn("relative h-5 w-5 transition-transform group-hover:scale-110", active && "text-white")} />
            <span className="relative">{t.nav[item.key]}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-72 flex-col border-e border-white/70 bg-white/60 p-5 backdrop-blur-xl lg:flex">
        <Link href={isOwner ? "/dashboard" : "/pos"} className="mb-8 flex items-center gap-3 px-2">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/30 animate-pulse-soft">
            <ChefHat className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-black text-slate-900">{user.shopName}</p>
            <p className="text-xs font-medium text-slate-500">{t.appName}</p>
          </div>
        </Link>

        <NavLinks />

        <div className="mt-auto space-y-3">
          {isOwner ? (
            <>
              <div
                className={cn(
                  "rounded-2xl p-3.5 text-sm ring-1",
                  user.daysLeft <= 7
                    ? "bg-amber-50 text-amber-800 ring-amber-200"
                    : "bg-emerald-50 text-emerald-800 ring-emerald-200",
                )}
              >
                <p className="flex items-center gap-2 font-bold">
                  <ShieldCheck className="h-4 w-4" />
                  {user.daysLeft <= 7 ? t.activate.expiringSoon : t.activate.statusActive}
                </p>
                <p className="mt-1 text-xs font-semibold opacity-80">
                  {user.daysLeft} {t.activate.daysLeft}
                </p>
                {user.daysLeft <= 7 && (
                  <Link
                    href="/activate"
                    className="mt-2 inline-block rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white"
                  >
                    {t.activate.renew}
                  </Link>
                )}
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white">
                <p className="text-xs text-slate-300">{t.settings.account}</p>
                <p className="truncate font-semibold">{user.name}</p>
                <p className="truncate text-xs text-slate-400">{user.email}</p>
              </div>
            </>
          ) : (
            <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 p-4 text-white shadow-lg shadow-emerald-500/30">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-100">
                <BadgeDollarSign className="h-4 w-4" /> {t.team.cashier}
              </p>
              <p className="mt-1 truncate font-black">{user.name}</p>
            </div>
          )}
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-rose-50 hover:text-rose-600 hover:ring-rose-200"
          >
            <LogOut className="h-4 w-4 rtl:rotate-180" /> {t.logout}
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/70 bg-white/70 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Link href={isOwner ? "/dashboard" : "/pos"} className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 text-white">
            <ChefHat className="h-5 w-5" />
          </span>
          <span className="truncate font-black text-slate-900">{user.shopName}</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          <LanguageToggle compact />
          <button
            aria-label="Menu"
            onClick={() => setMobileOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-xl bg-white text-slate-700 ring-1 ring-slate-200"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: isUrdu ? 320 : -320 }}
              animate={{ x: 0 }}
              exit={{ x: isUrdu ? 320 : -320 }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="absolute inset-y-0 start-0 flex w-72 flex-col bg-white p-5 shadow-2xl"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="font-black">{t.appName}</span>
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label={t.close}
                  className="grid h-9 w-9 place-items-center rounded-xl hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <NavLinks onNavigate={() => setMobileOpen(false)} />
              <button
                onClick={logout}
                className="mt-auto flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-rose-600 ring-1 ring-rose-200"
              >
                <LogOut className="h-4 w-4" /> {t.logout}
              </button>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main */}
      <main className="min-h-screen px-4 pb-28 pt-6 sm:px-6 lg:ps-80 lg:pe-8 lg:pb-12 lg:pt-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 hidden items-center justify-between lg:flex">
            <p className="text-sm font-semibold text-slate-500">
              {t.dashboard.welcome}, {user.name} 👋
            </p>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <LanguageToggle />
            </div>
          </div>
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        className={cn(
          "fixed inset-x-3 bottom-3 z-30 grid gap-1 rounded-3xl border border-white/70 bg-white/90 p-2 shadow-2xl shadow-slate-900/10 backdrop-blur-xl lg:hidden",
          mobileItems.length === 1 ? "grid-cols-2" : "grid-cols-5",
        )}
      >
        {mobileItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-bold transition-colors",
                active ? "bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-md shadow-orange-500/30" : "text-slate-500",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate">{t.nav[item.key]}</span>
            </Link>
          );
        })}
        {mobileItems.length === 1 && (
          <button
            onClick={logout}
            className="flex flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-bold text-rose-500"
          >
            <LogOut className="h-5 w-5" />
            {t.logout}
          </button>
        )}
      </nav>
    </div>
  );
}
