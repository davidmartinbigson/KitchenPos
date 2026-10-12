"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { BarChart3, ChefHat, Lock, LogIn, Mail, MonitorPlay, RotateCcw, ShoppingCart, Sparkles } from "lucide-react";
import type { MenuItemDTO } from "@/lib/types";
import { PosTerminal } from "@/components/pos/pos-terminal";
import { loadDemoOrders, resetDemoData } from "@/lib/demo";
import { currencyForCountry, detectCountryFromLocale } from "@/lib/countries";
import { formatMoney, formatTime } from "@/lib/format";

/** Four classic demo dishes (plus one seed set of local sales). */
const DEMO_ITEMS: MenuItemDTO[] = [
  { id: 9001, name: "Zinger Burger", category: "Mains", description: "Crispy & spicy", price: 450, imageData: null, emoji: "🍔", available: true, extras: [{ name: "Cheese", price: 80 }, { name: "Fries", price: 150 }] },
  { id: 9002, name: "Margherita Pizza", category: "Mains", description: "Wood-fired classic", price: 899, imageData: null, emoji: "🍕", available: true, extras: [{ name: "Large", price: 300 }] },
  { id: 9003, name: "Loaded Fries", category: "Sides", description: "Sauce heaven", price: 299, imageData: null, emoji: "🍟", available: true },
  { id: 9004, name: "Cold Coffee", category: "Drinks", description: "Ice-blended", price: 250, imageData: null, emoji: "🥤", available: true },
];

function useCurrency() {
  return useMemo(() => currencyForCountry(detectCountryFromLocale()), []);
}

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

/* ---------------------------------- demo sales ---------------------------------- */

function DemoSales({ currency }: { currency: string }) {
  const money = (n: number) => formatMoney(n, currency);
  const [orders] = useState(() => loadDemoOrders());
  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const itemsSold = orders.reduce((s, o) => s + o.items.reduce((a, i) => a + i.qty, 0), 0);
  const avg = orders.length ? Math.round(revenue / orders.length) : 0;

  const stats = [
    { label: "Revenue (demo)", value: money(revenue), tone: "text-emerald-600" },
    { label: "Orders", value: String(orders.length), tone: "text-slate-900" },
    { label: "Items sold", value: String(itemsSold), tone: "text-slate-900" },
    { label: "Average order", value: money(avg), tone: "text-orange-600" },
  ];

  return (
    <div className="space-y-5">
      <p className="rounded-2xl bg-amber-50 px-4 py-3 text-center text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
        📌 These numbers come from the demo sales stored in <b>your browser</b> — nothing was sent to any server.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <p className="text-xs font-semibold text-slate-500">{s.label}</p>
            <p className={`mt-1 text-xl font-black ${s.tone}`}>{s.value}</p>
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <p className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-800">Recent demo orders</p>
        <ul className="divide-y divide-slate-50">
          {orders.slice(0, 12).map((o) => (
            <li key={o.orderNumber} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="grid h-8 w-9 place-items-center rounded-lg bg-slate-100 text-[11px] font-black">
                #{o.orderNumber}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-800">{o.customer}</p>
                <p className="truncate text-xs text-slate-400">
                  {o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")} · {formatTime(o.at, "en")}
                </p>
              </div>
              <span className="shrink-0 font-black text-slate-900">{money(o.total)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ----------------------------------- the app ------------------------------------ */

export function DemoApp() {
  const [stage, setStage] = useState<"login" | "app">("login");
  const [tab, setTab] = useState<"pos" | "sales">("pos");
  const currency = useCurrency();

  if (stage === "login") return <DemoLogin onEnter={() => setStage("app")} />;

  return (
    <div className="min-h-svh bg-gradient-to-br from-orange-50 via-rose-50 to-amber-50 pb-16">
      {/* Demo top bar */}
      <header className="sticky top-0 z-30 border-b border-slate-900/5 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 text-white">
            <ChefHat className="h-5 w-5" />
          </span>
          <span className="font-black text-slate-900">Demo Bistro</span>
          <span className="rounded-full bg-orange-600 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-white">
            Demo
          </span>
          <div className="ms-auto flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 sm:flex">
              <Sparkles className="h-3.5 w-3.5" /> On-device data — server untouched
            </span>
            <button
              onClick={() => {
                resetDemoData();
                window.location.reload();
              }}
              className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600 transition hover:bg-slate-200"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset demo
            </button>
            <Link
              href="/signup"
              className="rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-3.5 py-1.5 text-[11px] font-black text-white shadow-sm transition hover:brightness-105"
            >
              Get started free →
            </Link>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl gap-2 px-4 pb-2.5">
          <button
            onClick={() => setTab("pos")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition ${
              tab === "pos" ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            <ShoppingCart className="h-3.5 w-3.5" /> Point of Sale
          </button>
          <button
            onClick={() => setTab("sales")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition ${
              tab === "sales" ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" /> Sales report
          </button>
          <span className="ms-auto hidden items-center gap-1.5 text-[11px] font-semibold text-slate-400 sm:flex">
            <MonitorPlay className="h-3.5 w-3.5" /> Print works too — try a receipt!
          </span>
        </div>
      </header>

      <main className={tab === "pos" ? "px-3 pt-4 sm:px-5" : "mx-auto max-w-4xl px-4 pt-6"}>
        {tab === "pos" ? (
          <PosTerminal
            initialItems={DEMO_ITEMS}
            currency={currency}
            shopName="Demo Bistro"
            sellerName="Demo Cashier"
            demoMode
            taxRate={5}
            paymentMethods={["online-payment", "Card"]}
            addons={{
              discounts: true,
              payments: true,
              orderTypes: true,
              whatsappCustomer: true,
              tax: true,
              receiptBrand: true,
            }}
            branding={{
              logo: "",
              header: "The tastiest imaginary food in town",
              footer: "Thanks for trying the Kitchen POS demo!",
              size: "80",
            }}
          />
        ) : (
          <DemoSales currency={currency} />
        )}
      </main>
    </div>
  );
}
