"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChefHat, Lock, LogIn, Mail } from "lucide-react";
import type { MenuItemDTO } from "@/lib/types";
import { PosTerminal } from "@/components/pos/pos-terminal";
import { DemoKitchen } from "@/components/demo/demo-kitchen";
import { DemoShell, type DemoTab } from "@/components/demo/demo-shell";
import { DemoAddons, DemoDashboard, DemoLive, DemoMenu, DemoSales, DemoStaff } from "@/components/demo/demo-views";
import { currencyForCountry, detectCountryFromLocale } from "@/lib/countries";

/** Demo dishes — Mango Shake starts sold-out to show stock tracking. */
const SEED_ITEMS: MenuItemDTO[] = [
  { id: 9001, name: "Zinger Burger", category: "Mains", description: "Crispy & spicy", price: 450, imageData: null, emoji: "🍔", available: true, extras: [{ name: "Cheese", price: 80 }, { name: "Fries", price: 150 }] },
  { id: 9002, name: "Margherita Pizza", category: "Mains", description: "Wood-fired classic", price: 899, imageData: null, emoji: "🍕", available: true, extras: [{ name: "Large", price: 300 }] },
  { id: 9003, name: "Loaded Fries", category: "Sides", description: "Sauce heaven", price: 299, imageData: null, emoji: "🍟", available: true },
  { id: 9004, name: "Cold Coffee", category: "Drinks", description: "Ice-blended", price: 250, imageData: null, emoji: "🥤", available: true },
  { id: 9005, name: "Caesar Salad", category: "Sides", description: "Fresh & light", price: 399, imageData: null, emoji: "🥗", available: true },
  { id: 9006, name: "Mango Shake", category: "Drinks", description: "Seasonal", price: 220, imageData: null, emoji: "🥭", available: true, stockQty: 0 },
];

function useCurrency() {
  return useMemo(() => currencyForCountry(detectCountryFromLocale()), []);
}

const POS_ADDONS = {
  discounts: true,
  payments: true,
  orderTypes: true,
  whatsappCustomer: true,
  tax: true,
  receiptBrand: true,
  stock: true,
  modifiers: true,
};

/* ---------------------------------- fake login ---------------------------------- */

function DemoLogin({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-orange-50 via-rose-50 to-amber-50 px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl ring-1 ring-slate-900/10"
      >
        <div className="bg-gradient-to-br from-orange-500 to-rose-500 px-8 pb-14 pt-8 text-center text-white">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/15">
            <ChefHat className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-2xl font-black">Live demo</h1>
          <p className="mt-1 text-sm text-orange-100">
            Everything works — but this store is make-believe. Your sales stay on this device only.
          </p>
        </div>
        <div className="px-8 pb-8 pt-6" style={{ marginTop: "-2.5rem" }}>
          <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-900/5">
            <label className="text-xs font-bold text-slate-500">Email</label>
            <div className="relative mt-1">
              <Mail className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                readOnly
                value="demo@kitchenpos.app"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 ps-12 pe-4 text-sm font-semibold text-slate-700 outline-none"
              />
            </div>
            <label className="mt-4 block text-xs font-bold text-slate-500">Password</label>
            <div className="relative mt-1">
              <Lock className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                readOnly
                type="password"
                value="demo-password"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 ps-12 pe-4 text-sm font-semibold text-slate-700 outline-none"
              />
            </div>
            <button
              onClick={onEnter}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-sm font-black text-white shadow-lg shadow-orange-500/30 transition hover:brightness-105"
            >
              <LogIn className="h-4 w-4" /> Log in to demo
            </button>
            <p className="mt-3 text-center text-xs text-slate-400">
              No password needed — just step in and play.
            </p>
          </div>
          <p className="mt-6 text-center text-xs text-slate-500">
            Ready for the real thing?{" "}
            <Link href="/signup" className="font-bold text-orange-600 hover:underline">
              Create your free account →
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

/* ----------------------------------- the app ------------------------------------ */

export function DemoApp() {
  const [stage, setStage] = useState<"login" | "app">("login");
  const [tab, setTab] = useState<DemoTab>("dashboard");
  const [items, setItems] = useState<MenuItemDTO[]>(SEED_ITEMS);
  const currency = useCurrency();

  if (stage === "login") return <DemoLogin onEnter={() => setStage("app")} />;

  const toggleItem = (id: number) =>
    setItems((all) => all.map((it) => (it.id === id ? { ...it, available: it.available === false } : it)));
  const addItem = (item: MenuItemDTO) => setItems((all) => [...all, item]);

  return (
    <DemoShell active={tab} onNavigate={setTab}>
      {tab === "dashboard" && <DemoDashboard currency={currency} />}
      {tab === "live" && <DemoLive currency={currency} />}
      {tab === "pos" && (
        <PosTerminal
          initialItems={items}
          currency={currency}
          shopName="Demo Bistro"
          sellerName="Demo Cashier"
          demoMode
          taxRate={5}
          paymentMethods={["online-payment", "Card"]}
          addons={POS_ADDONS}
          branding={{
            logo: "",
            header: "The tastiest imaginary food in town",
            footer: "Thanks for trying the Kitchen POS demo!",
            size: "80",
          }}
        />
      )}
      {tab === "kitchen" && <DemoKitchen />}
      {tab === "menu" && <DemoMenu items={items} currency={currency} onToggle={toggleItem} onAdd={addItem} />}
      {tab === "sales" && <DemoSales currency={currency} />}
      {tab === "team" && <DemoStaff />}
      {tab === "settings" && <DemoAddons />}
    </DemoShell>
  );
}
