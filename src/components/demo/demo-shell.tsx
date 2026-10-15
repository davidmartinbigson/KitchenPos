"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChefHat,
  CookingPot,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  Radio,
  RotateCcw,
  Settings,
  ShoppingBasket,
  TrendingUp,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useI18n } from "@/components/providers/language-provider";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/components/ui";
import { resetDemoData } from "@/lib/demo";

export type DemoTab = "dashboard" | "live" | "pos" | "kitchen" | "menu" | "sales" | "team" | "settings";

const demoNav = [
  { tab: "dashboard", key: "dashboard", icon: LayoutDashboard },
  { tab: "live", key: "live", icon: Radio },
  { tab: "pos", key: "pos", icon: ShoppingBasket },
  { tab: "kitchen", key: "kitchen", icon: CookingPot },
  { tab: "menu", key: "menu", icon: UtensilsCrossed },
  { tab: "sales", key: "sales", icon: TrendingUp },
  { tab: "team", key: "team", icon: Users },
  { tab: "settings", key: "settings", icon: Settings },
] as const;

const mobileDemoNav = demoNav.slice(0, 5);

/**
 * A pixel-match clone of the real AppShell for the public demo.
 * Same sidebar, same animated pill, same mobile drawer + bottom bar —
 * but navigation stays on-device (tab state) and nothing ever calls the server.
 */
export function DemoShell({ active, onNavigate, children }: { active: DemoTab; onNavigate: (tab: DemoTab) => void; children: ReactNode }) {
  const { t, isUrdu } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);

  function resetDemo() {
    resetDemoData();
    window.location.reload();
  }

  const NavLinks = ({ onNavigateTab }: { onNavigateTab?: () => void }) => (
    <nav className="flex flex-col gap-1.5">
      {demoNav.map((item) => {
        const isActive = active === item.tab;
        const Icon = item.icon;
        return (
          <button
            key={item.tab}
            onClick={() => {
              onNavigate(item.tab);
              onNavigateTab?.();
            }}
            className={cn(
              "group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-semibold transition-colors",
              isActive ? "text-white" : "text-slate-600 hover:bg-white hover:text-slate-900",
            )}
          >
            {isActive && (
              <motion.span
                layoutId="demo-nav-active"
                className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 shadow-lg shadow-orange-500/30"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <Icon className={cn("relative h-5 w-5 transition-transform group-hover:scale-110", isActive && "text-white")} />
            <span className="relative">{t.nav[item.key]}</span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-72 flex-col border-e border-white/70 bg-white/60 p-5 backdrop-blur-xl lg:flex">
        <div className="mb-8 flex items-center gap-3 px-2">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/30 animate-pulse-soft">
            <ChefHat className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-black text-slate-900">Demo Bistro</p>
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              {t.appName}
              <span className="rounded bg-orange-600 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">Demo</span>
            </p>
          </div>
        </div>

        <NavLinks />

        <div className="mt-auto space-y-3">
          <div className="rounded-2xl bg-amber-50 p-3.5 text-sm text-amber-800 ring-1 ring-amber-200">
            <p className="font-bold">🙂 You're in demo mode</p>
            <p className="mt-1 text-xs font-semibold opacity-80">All 15 add-ons ON · every order stays on your device — the real database is untouched.</p>
            <Link
              href="/signup"
              className="mt-2.5 block rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-3 py-2 text-center text-xs font-black text-white shadow-md shadow-orange-500/30 transition hover:brightness-105"
            >
              Get started free →
            </Link>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white">
            <p className="text-xs text-slate-300">{t.settings.account}</p>
            <p className="truncate font-semibold">Guest</p>
            <p className="truncate text-xs text-slate-400">demo@kitchenpos.app</p>
          </div>
          <button
            onClick={resetDemo}
            className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-red-50 hover:text-red-600 hover:ring-red-200"
          >
            <RotateCcw className="h-4 w-4" /> Reset demo
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/70 bg-white/70 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 text-white">
            <ChefHat className="h-5 w-5" />
          </span>
          <span className="truncate font-black text-slate-900">Demo Bistro</span>
          <span className="shrink-0 rounded bg-orange-600 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">Demo</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          <LanguageToggle compact />
          <button
            aria-label="Menu"
            onClick={() => setMobileOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-xl bg-white text-slate-700 ring-1 ring-slate-200"
          >
            <MenuIcon className="h-5 w-5" />
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
              <NavLinks onNavigateTab={() => setMobileOpen(false)} />
              <button
                onClick={resetDemo}
                className="mt-auto flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-red-600 ring-1 ring-red-200"
              >
                <LogOut className="h-4 w-4" /> Reset demo
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
              {t.dashboard.welcome}, Guest 👋
            </p>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <LanguageToggle />
            </div>
          </div>
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 gap-1 rounded-3xl border border-white/70 bg-white/90 p-2 shadow-2xl shadow-slate-900/10 backdrop-blur-xl lg:hidden">
        {mobileDemoNav.map((item) => {
          const isActive = active === item.tab;
          const Icon = item.icon;
          return (
            <button
              key={item.tab}
              onClick={() => onNavigate(item.tab)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-bold transition-colors",
                isActive ? "bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-md shadow-orange-500/30" : "text-slate-500",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate">{t.nav[item.key]}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
