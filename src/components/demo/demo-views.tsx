"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Plus, Power, QrCode } from "lucide-react";
import type { MenuItemDTO } from "@/lib/types";
import { loadDemoOrders, type DemoOrder } from "@/lib/demo";
import { formatMoney, formatTime } from "@/lib/format";
import { QrMenuClient } from "@/components/qr-menu/qr-menu-client";
import { READY_ADDONS } from "@/lib/addons";
import { useI18n } from "@/components/providers/language-provider";

/** Re-reads the on-device demo ledger every 2s so POS/QR orders appear live everywhere. */
function useDemoOrders(): DemoOrder[] {
  const [orders, setOrders] = useState<DemoOrder[]>([]);
  useEffect(() => {
    const read = () => setOrders(loadDemoOrders());
    read();
    const id = window.setInterval(read, 2000);
    return () => window.clearInterval(id);
  }, []);
  return orders;
}

const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

function last7Days(orders: DemoOrder[]) {
  const days: { label: string; total: number; date: Date }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const total = orders
      .filter((o) => new Date(o.at).toDateString() === d.toDateString())
      .reduce((s, o) => s + o.total, 0);
    days.push({ label: d.toLocaleDateString("en", { weekday: "short" }), total, date: d });
  }
  return days;
}

function WeekChart({ orders, currency }: { orders: DemoOrder[]; currency: string }) {
  const days = last7Days(orders);
  const max = Math.max(1, ...days.map((d) => d.total));
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <p className="mb-3 text-sm font-black text-slate-800">Last 7 days</p>
      <div className="flex h-36 items-end gap-2">
        {days.map((d, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-500">{d.total > 0 ? formatMoney(d.total, currency) : ""}</span>
            <div
              className="w-full rounded-t-lg bg-gradient-to-t from-orange-500 to-rose-400 transition-all"
              style={{ height: `${Math.max(d.total > 0 ? 8 : 2, (d.total / max) * 84)}%` }}
            />
            <span className={`text-[10px] font-bold ${i === 6 ? "text-orange-600" : "text-slate-400"}`}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------- dashboard ---------------------------------- */

export function DemoDashboard({ currency }: { currency: string }) {
  const orders = useDemoOrders();
  const today = orders.filter((o) => isToday(o.at));
  const todayRevenue = today.reduce((s, o) => s + o.total, 0);
  const itemsToday = today.reduce((s, o) => s + o.items.reduce((a, i) => a + i.qty, 0), 0);
  const weekRevenue = last7Days(orders).reduce((s, d) => s + d.total, 0);
  const money = (n: number) => formatMoney(n, currency);

  const dishCounts = new Map<string, number>();
  today.forEach((o) => o.items.forEach((i) => dishCounts.set(i.name, (dishCounts.get(i.name) ?? 0) + i.qty)));
  const top3 = [...dishCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  const stats = [
    { label: "Today's revenue", value: money(todayRevenue), tone: "text-emerald-600" },
    { label: "Today's orders", value: String(today.length), tone: "text-slate-900" },
    { label: "Items sold today", value: String(itemsToday), tone: "text-slate-900" },
    { label: "Last 7 days", value: money(weekRevenue), tone: "text-orange-600" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <p className="text-xs font-semibold text-slate-500">{s.label}</p>
            <p className={`mt-1 text-xl font-black ${s.tone}`}>{s.value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <WeekChart orders={orders} currency={currency} />
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <p className="mb-3 text-sm font-black text-slate-800">⭐ Top dishes today</p>
          {top3.length === 0 ? (
            <p className="text-xs text-slate-400">No sales yet today — try the POS!</p>
          ) : (
            <ul className="space-y-2.5">
              {top3.map(([name, qty], i) => (
                <li key={name} className="flex items-center gap-2.5 text-sm">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-100 text-xs font-black text-amber-700">{i + 1}</span>
                  <span className="flex-1 truncate font-semibold text-slate-700">{name}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black">{qty}×</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <p className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-800">Recent orders</p>
        <ul className="divide-y divide-slate-50">
          {orders.slice(0, 6).map((o) => (
            <li key={o.orderNumber} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="grid h-8 w-9 place-items-center rounded-lg bg-slate-100 text-[11px] font-black">#{o.orderNumber}</span>
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

/* ------------------------------------ live ------------------------------------- */

export function DemoLive({ currency }: { currency: string }) {
  const orders = useDemoOrders();
  const money = (n: number) => formatMoney(n, currency);
  const statusOf = (iso: string) => {
    const mins = (Date.now() - +new Date(iso)) / 60_000;
    return mins < 3
      ? { label: "🆕 New", cls: "bg-sky-100 text-sky-700 ring-sky-200" }
      : mins < 12
        ? { label: "🔥 Preparing", cls: "bg-amber-100 text-amber-700 ring-amber-200" }
        : { label: "✅ Served", cls: "bg-emerald-100 text-emerald-700 ring-emerald-200" };
  };

  return (
    <div>
      <p className="mb-4 rounded-2xl bg-sky-50 px-4 py-3 text-xs font-semibold text-sky-700 ring-1 ring-sky-200">
        📡 Owner's live order feed — place an order in the POS or QR menu and watch it appear here within seconds.
      </p>
      <ul className="space-y-3">
        {orders.slice(0, 10).map((o) => {
          const st = statusOf(o.at);
          return (
            <li key={o.orderNumber} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <span className="grid h-10 w-11 shrink-0 place-items-center rounded-xl bg-slate-900 text-xs font-black text-white">#{o.orderNumber}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-slate-900">{o.customer}</p>
                <p className="truncate text-xs text-slate-400">
                  {o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")} · {formatTime(o.at, "en")}
                </p>
              </div>
              <span className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 sm:block ${st.cls}`}>{st.label}</span>
              <span className="shrink-0 font-black text-slate-900">{money(o.total)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------ sales ------------------------------------ */

export function DemoSales({ currency }: { currency: string }) {
  const orders = useDemoOrders();
  const money = (n: number) => formatMoney(n, currency);
  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const itemsSold = orders.reduce((s, o) => s + o.items.reduce((a, i) => a + i.qty, 0), 0);
  const avg = orders.length ? Math.round(revenue / orders.length) : 0;
  const stats = [
    { label: "Revenue (7 days)", value: money(revenue), tone: "text-emerald-600" },
    { label: "Orders", value: String(orders.length), tone: "text-slate-900" },
    { label: "Items sold", value: String(itemsSold), tone: "text-slate-900" },
    { label: "Average order", value: money(avg), tone: "text-orange-600" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <p className="text-xs font-semibold text-slate-500">{s.label}</p>
            <p className={`mt-1 text-xl font-black ${s.tone}`}>{s.value}</p>
          </div>
        ))}
      </div>
      <WeekChart orders={orders} currency={currency} />
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <p className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-800">All demo orders</p>
        <ul className="divide-y divide-slate-50">
          {orders.map((o) => (
            <li key={o.orderNumber} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="grid h-8 w-9 place-items-center rounded-lg bg-slate-100 text-[11px] font-black">#{o.orderNumber}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-800">{o.customer}</p>
                <p className="truncate text-xs text-slate-400">
                  {new Date(o.at).toLocaleDateString("en", { month: "short", day: "numeric" })} · {o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")} ·{" "}
                  {formatTime(o.at, "en")}
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

/* ---------------------------------- menu manage --------------------------------- */

export function DemoMenu({
  items,
  currency,
  onToggle,
  onAdd,
}: {
  items: MenuItemDTO[];
  currency: string;
  onToggle: (id: number) => void;
  onAdd: (item: MenuItemDTO) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("350");
  const [emoji, setEmoji] = useState("🍽️");
  const [category, setCategory] = useState("Mains");

  function add() {
    if (!name.trim()) return;
    onAdd({
      id: 10000 + (Date.now() % 100000),
      name: name.trim(),
      category,
      description: "",
      price: Math.max(1, Math.round(Number(price) || 1)),
      imageData: null,
      emoji: emoji.trim() || "🍽️",
      available: true,
    });
    setName("");
    setShowAdd(false);
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-black text-slate-900">Your dishes</h2>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200">
            Toggling a dish off instantly removes it from POS & QR menu ↓
          </span>
          <button
            onClick={() => setShowAdd(true)}
            className="ms-auto flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white transition hover:brightness-110"
          >
            <Plus className="h-3.5 w-3.5" /> Add dish
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <div key={it.id} className={`rounded-2xl bg-white p-4 shadow-sm ring-1 transition ${it.available !== false ? "ring-slate-100" : "opacity-55 ring-slate-200 grayscale"}`}>
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-50 text-2xl">{it.emoji || "🍽️"}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-900">{it.name}</p>
                  <p className="text-xs font-semibold text-slate-400">
                    {it.category} · {formatMoney(it.price, currency)}
                  </p>
                </div>
                <button
                  onClick={() => onToggle(it.id)}
                  title={it.available !== false ? "Turn off" : "Turn on"}
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 transition ${it.available !== false ? "bg-emerald-50 text-emerald-600 ring-emerald-200" : "bg-slate-100 text-slate-400 ring-slate-200"}`}
                >
                  <Power className="h-4 w-4" />
                </button>
              </div>
              {it.available !== false && it.stockQty != null && it.stockQty <= 0 && (
                <span className="mt-2 inline-block rounded bg-red-100 px-2 py-0.5 text-[11px] font-black text-red-700">Sold out</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-black text-slate-900">
          <QrCode className="h-5 w-5 text-orange-500" /> Guest QR menu — exact visitor view
        </h2>
        <p className="mb-3 text-xs font-semibold text-slate-400">This is what your customers see after scanning the table QR code. Go ahead, place an order!</p>
        <div className="overflow-hidden rounded-3xl ring-1 ring-slate-200">
          <QrMenuClient
            restaurantId={0}
            shopName="Demo Bistro"
            currency={currency}
            active
            items={items.filter((it) => it.available !== false)}
            taxRate={5}
            guestTracking={false}
            paymentProof={false}
            demoMode
          />
        </div>
      </div>

      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={() => setShowAdd(false)}
        >
          <div className="w-full max-w-sm rounded-[2rem] bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black text-slate-900">Add a demo dish</h3>
            <div className="mt-4 space-y-3">
              <div className="flex gap-3">
                <input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="h-11 w-16 rounded-xl border border-slate-200 text-center text-xl outline-none focus:border-orange-400" />
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dish name" className="h-11 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400" />
              </div>
              <div className="flex gap-3">
                <input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))} placeholder="Price" className="h-11 w-28 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400" />
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none">
                  <option>Mains</option>
                  <option>Sides</option>
                  <option>Drinks</option>
                </select>
              </div>
              <button onClick={add} className="h-11 w-full rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-sm font-black text-white shadow-lg shadow-orange-500/30">
                Add to menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------- team ----------------------------------- */

const DEMO_STAFF = [
  { name: "Sam", role: "Cashier", active: true, sales: 18, tone: "bg-emerald-100 text-emerald-700 ring-emerald-200" },
  { name: "Riaz", role: "Kitchen", active: true, sales: null, tone: "bg-emerald-100 text-emerald-700 ring-emerald-200" },
  { name: "Aliya", role: "Cashier", active: false, sales: 11, tone: "bg-slate-100 text-slate-400 ring-slate-200" },
];

export function DemoStaff() {
  return (
    <div>
      <p className="mb-4 rounded-2xl bg-violet-50 px-4 py-3 text-xs font-semibold text-violet-700 ring-1 ring-violet-200">
        👥 Team add-on — invite cashiers & kitchen staff with their own logins. Each cashier sees only their own sales.
      </p>
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <ul className="divide-y divide-slate-50">
          {DEMO_STAFF.map((m) => (
            <li key={m.name} className="flex items-center gap-3 px-4 py-3.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-sm font-black text-white">
                {m.name[0]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-slate-900">{m.name}</p>
                <p className="text-xs font-semibold text-slate-400">
                  {m.role} {m.sales != null && `· ${m.sales} sales this week`}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${m.tone}`}>{m.active ? "Active" : "Paused"}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------------- add-ons ---------------------------------- */

export function DemoAddons() {
  const { t } = useI18n();
  const list = t.settings.addonList as unknown as Record<string, { name: string; desc: string }>;
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <p className="text-sm font-black text-slate-900">Shop profile</p>
        <p className="mt-1 text-xs font-semibold text-slate-400">Demo Bistro · Restaurant · POS: cash counter · QR codes enabled</p>
      </div>
      <div>
        <div className="mb-4 rounded-2xl bg-emerald-50 px-4 py-3 text-center text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
          ✅ All {READY_ADDONS.length} add-ons are switched ON in this demo — shop owners toggle exactly what they need.
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {READY_ADDONS.map((key) => (
            <div key={key} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <p className="flex items-center gap-2 text-sm font-black text-slate-900">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> {list[key]?.name ?? key}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{list[key]?.desc ?? ""}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
