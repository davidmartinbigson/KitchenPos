"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Radio, Banknote, ShoppingBag, Sparkles, ListOrdered } from "lucide-react";
import { Card } from "@/components/ui";
import { useI18n } from "@/components/providers/language-provider";

type OrderItem = { id: number; name: string; quantity: number; lineTotal: number };
type OrderRow = {
  id: number;
  orderNumber: number;
  total: number;
  itemCount: number;
  createdAt: string;
  takenBy: string | null;
  items: OrderItem[];
};
type ExpenseRow = { id: number; title: string; amount: number; createdAt: string };

export function LiveView({ currency }: { currency: string }) {
  const { lang } = useI18n();
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRow[] | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const L =
    lang === "ur"
      ? {
          title: "لائیو سیل",
          sale: "آج کی سیل",
          orders: "آرڈرز",
          bachat: "بچت (سیل − خرچہ)",
          topItem: "آج کا ٹاپ آئٹم",
          recent: "تازہ آرڈرز",
          noOrders: "آج ابھی تک کوئی آرڈر نہیں۔",
          updated: "اپ ڈیٹ ہوا",
          avg: "اوسط آرڈر",
          expensesH: "خرچہ",
        }
      : {
          title: "Live today",
          sale: "Today's sale",
          orders: "Orders",
          bachat: "Bachat (sale − expenses)",
          topItem: "Top item today",
          recent: "Latest orders",
          noOrders: "No orders yet today.",
          updated: "Updated",
          avg: "Avg order",
          expensesH: "Expenses",
        };

  const load = useCallback(async () => {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const from = dayStart.toISOString();
    const to = new Date().toISOString();
    try {
      const [oRes, eRes] = await Promise.all([
        fetch(`/api/orders?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=300`),
        fetch(`/api/expenses?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
      ]);
      if (oRes.ok) {
        const data = (await oRes.json()) as { orders: OrderRow[] };
        setOrders(data.orders ?? []);
      }
      if (eRes.ok) {
        const data = (await eRes.json()) as { expenses: ExpenseRow[] };
        setExpenses(data.expenses ?? []);
      }
      setUpdatedAt(new Date());
    } catch {
      /* keep stale data on network hiccups */
    }
  }, []);

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, 15000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [load]);

  const money = (n: number) => `${currency} ${n.toLocaleString()}`;
  const sale = (orders ?? []).reduce((s, o) => s + o.total, 0);
  const orderCount = (orders ?? []).length;
  const expTotal = (expenses ?? []).reduce((s, e) => s + e.amount, 0);
  const bachat = sale - expTotal;

  const topItem = (() => {
    const tally = new Map<string, number>();
    for (const o of orders ?? []) {
      for (const it of o.items ?? []) tally.set(it.name, (tally.get(it.name) ?? 0) + it.quantity);
    }
    let best: { name: string; qty: number } | null = null;
    for (const [name, qty] of tally) if (!best || qty > best.qty) best = { name, qty };
    return best;
  })();

  const recent = [...(orders ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  ).slice(0, 10);
  const timeFmt = (iso: string) =>
    new Date(iso).toLocaleTimeString(lang === "ur" ? "ur-PK" : "en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
          </span>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
            <Radio className="h-6 w-6 text-emerald-500" /> {L.title}
          </h1>
        </div>
        {updatedAt && (
          <p className="text-xs text-slate-400">
            {L.updated} {timeFmt(updatedAt.toISOString())}
          </p>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <Banknote className="h-4 w-4 text-emerald-500" /> {L.sale}
          </div>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            {orders === null ? "…" : money(sale)}
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <ShoppingBag className="h-4 w-4 text-orange-500" /> {L.orders}
          </div>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            {orders === null ? "…" : orderCount}
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <Sparkles className="h-4 w-4 text-amber-500" /> {L.bachat}
          </div>
          <p className={`mt-2 text-3xl font-extrabold tracking-tight ${bachat >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {orders === null || expenses === null ? "…" : money(bachat)}
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <Sparkles className="h-4 w-4 text-sky-500" /> {L.topItem}
          </div>
          <p className="mt-2 truncate text-3xl font-extrabold tracking-tight text-slate-900">
            {topItem ? `${topItem.qty}× ${topItem.name}` : orders === null ? "…" : "—"}
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <ListOrdered className="h-5 w-5 text-slate-400" /> {L.recent}
        </h2>
        {recent.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">{L.noOrders}</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {recent.map((o) => (
              <li key={o.id} className="flex items-center gap-3 py-2.5">
                <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-600">
                  #{o.orderNumber}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                  {o.items?.map((i) => `${i.quantity}× ${i.name}`).join(", ") || `${o.itemCount}`}
                </span>
                {o.takenBy === "QR Order" && (
                  <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                    QR
                  </span>
                )}
                <span className="shrink-0 text-xs text-slate-400">{timeFmt(o.createdAt)}</span>
                <span className="w-24 shrink-0 text-right text-sm font-bold text-slate-900">{money(o.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
