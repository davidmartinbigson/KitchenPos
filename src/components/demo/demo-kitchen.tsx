"use client";

import { useState } from "react";

/**
 * Interactive kitchen-screen mock for the static demo.
 * Cards move New → Preparing → Ready with local state only.
 */
type KItem = { name: string; qty: number; note?: string };
type KOrder = { id: number; number: number; customer: string; type: string; mins: number; stage: "new" | "preparing" | "ready"; items: KItem[] };

const SEED: KOrder[] = [
  {
    id: 1, number: 1043, customer: "Table 4", type: "dine-in", mins: 2, stage: "new",
    items: [
      { name: "Zinger Burger", qty: 2, note: "extra spicy 🌶️" },
      { name: "Loaded Fries", qty: 1 },
    ],
  },
  {
    id: 2, number: 1044, customer: "Sara", type: "takeaway", mins: 6, stage: "preparing",
    items: [{ name: "Margherita Pizza", qty: 1 }, { name: "Cold Coffee", qty: 2, note: "less sugar" }],
  },
  {
    id: 3, number: 1045, customer: "Delivery #12", type: "delivery", mins: 11, stage: "preparing",
    items: [{ name: "Caesar Salad", qty: 1 }, { name: "Loaded Fries", qty: 2 }],
  },
  {
    id: 4, number: 1042, customer: "Omar", type: "dine-in", mins: 14, stage: "ready",
    items: [{ name: "Zinger Burger", qty: 1, note: "no mayo" }, { name: "Cold Coffee", qty: 1 }],
  },
];

const COLS: { key: KOrder["stage"]; label: string; emoji: string; bucket: string; action: string | null }[] = [
  { key: "new", label: "New", emoji: "🆕", bucket: "border-sky-400/30 bg-sky-500/[0.07]", action: "Start" },
  { key: "preparing", label: "Preparing", emoji: "🔥", bucket: "border-amber-400/30 bg-amber-500/[0.06]", action: "Mark ready" },
  { key: "ready", label: "Ready", emoji: "✅", bucket: "border-emerald-400/25 bg-emerald-500/[0.05]", action: "Serve" },
];

export function DemoKitchen() {
  const [orders, setOrders] = useState<KOrder[]>(SEED);

  function advance(o: KOrder) {
    setOrders((all) =>
      all
        .map((x): KOrder =>
          x.id !== o.id
            ? x
            : { ...x, stage: x.stage === "new" ? "preparing" : x.stage === "preparing" ? "ready" : x.stage },
        )
        .filter((x) => !(x.id === o.id && o.stage === "ready")),
    );
  }

  return (
    <div className="rounded-[2rem] bg-slate-950 p-4 text-white shadow-2xl sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h3 className="text-lg font-black">🔥 Kitchen display</h3>
        <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 ring-1 ring-emerald-400/30">
          live feed · demo
        </span>
        <span className="ms-auto text-[11px] font-semibold text-slate-400">Orders flow: POS / QR → here → served</span>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {COLS.map((col) => {
          const list = orders.filter((o) => o.stage === col.key);
          return (
            <div key={col.key}>
              <p className="mb-2 flex items-center gap-2 text-sm font-bold">
                <span>{col.emoji}</span> {col.label}
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-black">{list.length}</span>
              </p>
              <div className="space-y-3">
                {list.length === 0 && <p className="rounded-2xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-500">empty</p>}
                {list.map((o) => (
                  <div key={o.id} className={`rounded-2xl border p-3.5 ${col.bucket}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="shrink-0 rounded-lg bg-white/10 px-2 py-0.5 text-sm font-black">#{o.number}</span>
                        <span className="truncate text-sm font-black">{o.customer}</span>
                        {o.type !== "dine-in" && (
                          <span className="shrink-0 rounded-full bg-fuchsia-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-fuchsia-200 ring-1 ring-fuchsia-400/30">
                            {o.type}
                          </span>
                        )}
                      </div>
                      <span className={`shrink-0 text-[11px] font-bold ${o.mins >= 10 ? "text-red-300" : "text-slate-400"}`}>
                        ⏱ {o.mins}m
                      </span>
                    </div>
                    <ul className="mt-2.5 space-y-1.5">
                      {o.items.map((it) => (
                        <li key={it.name + (it.note ?? "")} className="rounded-xl bg-black/25 px-2.5 py-2">
                          <p className="text-[13px] font-bold">
                            <span className="me-1 text-amber-300">{it.qty}×</span> {it.name}
                          </p>
                          {it.note && <p className="text-[11px] font-bold italic text-orange-300">↳ {it.note}</p>}
                        </li>
                      ))}
                    </ul>
                    {col.action && (
                      <button
                        onClick={() => advance(o)}
                        className="mt-2.5 w-full rounded-xl bg-white/10 py-2 text-xs font-black transition hover:bg-white/20"
                      >
                        {col.action} →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
