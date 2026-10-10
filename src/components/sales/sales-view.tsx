"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronDown, Download, MessageCircle, Plus, Receipt, Sparkles, Trash2, TrendingUp, Trophy, Wallet } from "lucide-react";
import { useI18n } from "@/components/providers/language-provider";
import { AnimatedNumber } from "@/components/animated-number";
import { Badge, Button, Card, EmptyState, Input, Select, Skeleton, cn } from "@/components/ui";
import { formatDate, formatMoney, formatNumber, formatTime, toLocalDateKey } from "@/lib/format";

type DailyRow = { day: string; revenue: number; orders: number };
type ExpenseRow = { id: number; title: string; amount: number; createdAt: string };
type OrderRow = {
  id: number;
  orderNumber: number;
  customerName: string;
  takenBy: string;
  subtotal: number;
  total: number;
  amountReceived: number;
  changeDue: number;
  itemCount: number;
  createdAt: string;
  items: { id: number; name: string; unitPrice: number; quantity: number; lineTotal: number }[];
};

const PERIOD_DAYS = 30;

function dayRange(key: string) {
  const start = new Date(`${key}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

export function SalesView({ currency }: { currency: string }) {
  const { t, lang } = useI18n();
  const S = t.sales;
  const money = (n: number) => formatMoney(n, currency);

  const [daily, setDaily] = useState<DailyRow[] | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>(toLocalDateKey());
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [exportRange, setExportRange] = useState<"month" | "day" | "all">("month");
  const [expenses, setExpenses] = useState<ExpenseRow[] | null>(null);
  const [expForm, setExpForm] = useState({ title: "", amount: "" });
  const [expSaving, setExpSaving] = useState(false);
  const todayKey = toLocalDateKey();

  useEffect(() => {
    const tz = new Date().getTimezoneOffset();
    fetch(`/api/stats?days=${PERIOD_DAYS}&tz=${tz}&today=${todayKey}`)
      .then((r) => r.json())
      .then((data: { daily: DailyRow[] }) => setDaily(data.daily ?? []))
      .catch(() => setDaily([]));
  }, [todayKey]);

  useEffect(() => {
    setOrders(null);
    setExpanded(null);
    const { from, to } = dayRange(selectedDay);
    fetch(`/api/orders?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=500`)
      .then((r) => r.json())
      .then((data: { orders: OrderRow[] }) => setOrders(data.orders ?? []))
      .catch(() => setOrders([]));
  }, [selectedDay]);

  useEffect(() => {
    setExpenses(null);
    const { from, to } = dayRange(selectedDay);
    fetch(`/api/expenses?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .then((r) => r.json())
      .then((data: { expenses: ExpenseRow[] }) => setExpenses(data.expenses ?? []))
      .catch(() => setExpenses([]));
  }, [selectedDay]);

  const periodTotals = useMemo(() => {
    if (!daily) return null;
    const revenue = daily.reduce((s, d) => s + d.revenue, 0);
    const count = daily.reduce((s, d) => s + d.orders, 0);
    const best = daily.reduce((b, d) => (d.revenue > b.revenue ? d : b), daily[0] ?? { day: "", revenue: 0, orders: 0 });
    return { revenue, count, best };
  }, [daily]);

  const maxDay = Math.max(1, ...(daily?.map((d) => d.revenue) ?? [1]));
  const dayRevenue = orders?.reduce((s, o) => s + o.total, 0) ?? 0;
  const dayOrderCount = orders?.length ?? 0;

  const expTotal = (expenses ?? []).reduce((s, e) => s + e.amount, 0);
  const bachat = dayRevenue - expTotal;

  const addExpense = async (event: FormEvent) => {
    event.preventDefault();
    const amount = Math.round(Number(expForm.amount));
    if (!expForm.title.trim() || !Number.isFinite(amount) || amount < 1) return;
    setExpSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: expForm.title.trim(), amount }),
      });
      if (res.ok) {
        const data = (await res.json()) as { expense: ExpenseRow };
        setExpenses((prev) => [...(prev ?? []), data.expense]);
        setExpForm({ title: "", amount: "" });
      }
    } finally {
      setExpSaving(false);
    }
  };

  const removeExpense = async (id: number) => {
    setExpenses((prev) => (prev ?? []).filter((e) => e.id !== id));
    await fetch(`/api/expenses/${id}`, { method: "DELETE" }).catch(() => {});
  };

  const shareDaySummary = () => {
    const lines = [
      `🍽️ ${S.dayClose}`,
      dayLabel(selectedDay),
      `${S.saleLabel}: ${money(dayRevenue)}`,
      `${S.expenseLabel}: ${money(expTotal)}${expenses && expenses.length ? ` (${formatNumber(expenses.length, lang)})` : ""}`,
      `✨ ${S.bachatLabel}: ${money(bachat)}`,
      `${S.dayOrders}: ${formatNumber(dayOrderCount, lang)}`,
      "— Kitchen POS",
    ];
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
  };

  const dayLabel = (key: string) =>
    formatDate(new Date(`${key}T00:00:00`), lang);

  const weekday = (key: string) =>
    new Date(`${key}T00:00:00`).toLocaleDateString(lang === "ur" ? "ur-PK" : "en-US", { weekday: "short" });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">{S.title}</h1>
          <p className="mt-1 text-slate-600">{S.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-slate-200">
          <CalendarDays className="h-5 w-5 text-orange-500" />
          <span className="text-sm font-semibold text-slate-600">{S.date}</span>
          <input
            type="date"
            value={selectedDay}
            max={todayKey}
            onChange={(e) => e.target.value && setSelectedDay(e.target.value)}
            className="bg-transparent font-bold text-slate-900 outline-none"
          />
        </label>
        <Select value={exportRange} onChange={(e) => setExportRange(e.target.value as "month" | "day" | "all")} aria-label={S.exportCsv}>
          <option value="month">{S.rangeMonth}</option>
          <option value="day">{S.rangeDay}</option>
          <option value="all">{S.rangeAll}</option>
        </Select>
        <Button variant="secondary" onClick={() => (window.location.href = "/api/sales/export?range=" + exportRange + "&day=" + selectedDay + "&tz=" + new Date().getTimezoneOffset())}>
          <Download className="h-4 w-4" /> {S.exportCsv}
        </Button>
        </div>
      </header>

      {/* Day close: Sale − Kharcha = Bachat */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Sparkles className="h-5 w-5 text-amber-500" /> {S.dayClose}
            </h2>
            <p className="text-sm text-slate-500">{dayLabel(selectedDay)}</p>
          </div>
          <Button variant="secondary" onClick={shareDaySummary}>
            <MessageCircle className="h-4 w-4 text-emerald-600" /> {S.waShare}
          </Button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{S.saleLabel}</p>
            <p className="mt-1 text-2xl font-black text-slate-900">
              <AnimatedNumber value={dayRevenue} format={(n) => money(n)} />
            </p>
          </div>
          <div className="rounded-2xl bg-red-50 p-4 ring-1 ring-red-200">
            <p className="text-xs font-bold uppercase tracking-wide text-red-500">{S.expenseLabel}</p>
            <p className="mt-1 text-2xl font-black text-red-700">
              {expenses === null ? <Skeleton className="h-8 w-24" /> : money(expTotal)}
            </p>
          </div>
          <div
            className={cn(
              "rounded-2xl p-4 ring-1",
              bachat >= 0 ? "bg-emerald-50 ring-emerald-200" : "bg-red-50 ring-red-200",
            )}
          >
            <p
              className={cn(
                "text-xs font-bold uppercase tracking-wide",
                bachat >= 0 ? "text-emerald-600" : "text-red-500",
              )}
            >
              {S.bachatLabel} <span className="font-medium normal-case">({S.bachatHint})</span>
            </p>
            <p className={cn("mt-1 text-2xl font-black", bachat >= 0 ? "text-emerald-700" : "text-red-700")}>
              <AnimatedNumber value={bachat} format={(n) => money(n)} />
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-bold text-slate-700">{S.expTitle}</h3>
            <form onSubmit={addExpense} className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Input
                value={expForm.title}
                onChange={(e) => setExpForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={S.expNamePh}
                maxLength={120}
                className="flex-1"
              />
              <Input
                value={expForm.amount}
                onChange={(e) => setExpForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder={S.expAmountPh}
                type="number"
                min="1"
                className="sm:w-28"
              />
              <Button type="submit" disabled={expSaving}>
                <Plus className="h-4 w-4" /> {S.expAdd}
              </Button>
            </form>
          </div>
          <div>
            {!expenses ? (
              <Skeleton className="h-24 w-full" />
            ) : expenses.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 py-5 text-center text-sm text-slate-500 ring-1 ring-slate-100">
                {S.expNone}
              </p>
            ) : (
              <ul className="scroll-thin max-h-48 space-y-2 overflow-y-auto pe-1">
                {expenses.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">{e.title}</span>
                    <span className="shrink-0 text-xs text-slate-400">{formatTime(e.createdAt, lang)}</span>
                    <span className="shrink-0 text-sm font-bold text-red-600">{money(e.amount)}</span>
                    <button
                      onClick={() => removeExpense(e.id)}
                      className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                      aria-label="Delete expense"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>

      {/* Period summary */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: `${S.lastDays}: ${S.dayRevenue}`,
            node: periodTotals ? <AnimatedNumber value={periodTotals.revenue} format={(n) => money(n)} /> : null,
            icon: Wallet,
            gradient: "from-orange-500 to-rose-500",
          },
          {
            label: `${S.lastDays}: ${S.dayOrders}`,
            node: periodTotals ? <AnimatedNumber value={periodTotals.count} format={(n) => formatNumber(Math.round(n), lang)} /> : null,
            icon: Receipt,
            gradient: "from-emerald-500 to-teal-500",
          },
          {
            label: `${S.lastDays}: best day`,
            node: periodTotals?.best && periodTotals.best.revenue > 0 ? (
              <span className="text-2xl">
                {dayLabel(periodTotals.best.day)} · {money(periodTotals.best.revenue)}
              </span>
            ) : (
              <span className="text-2xl">—</span>
            ),
            icon: Trophy,
            gradient: "from-amber-400 to-orange-500",
          },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div key={card.label} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card hover className="relative overflow-hidden p-5">
                <div className={cn("absolute -end-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-20 blur-2xl", card.gradient)} />
                <div className="flex items-center gap-3">
                  <span className={cn("grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg", card.gradient)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{card.label}</p>
                </div>
                <p className="mt-3 text-2xl font-black tracking-tight text-slate-900">
                  {card.node ?? <Skeleton className="h-8 w-28" />}
                </p>
              </Card>
            </motion.div>
          );
        })}
      </section>

      <div className="grid gap-6 xl:grid-cols-5">
        {/* Daily totals */}
        <Card className="p-6 xl:col-span-2">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-slate-900">
            <TrendingUp className="h-5 w-5 text-orange-500" /> {S.dailyTotals}
          </h2>
          {!daily ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : daily.every((d) => d.orders === 0) ? (
            <p className="py-10 text-center text-sm text-slate-500">{S.noDays}</p>
          ) : (
            <ul className="scroll-thin max-h-[520px] space-y-2 overflow-y-auto pe-1">
              {[...daily].reverse().map((d, i) => {
                const active = d.day === selectedDay;
                return (
                  <motion.li
                    key={d.day}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.4) }}
                  >
                    <button
                      onClick={() => setSelectedDay(d.day)}
                      className={cn(
                        "group w-full rounded-2xl p-3 text-start transition",
                        active ? "bg-slate-900 text-white shadow-lg" : "bg-slate-50 hover:bg-orange-50",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">
                            {dayLabel(d.day)}{" "}
                            <span className={cn("font-medium", active ? "text-slate-300" : "text-slate-400")}>
                              {weekday(d.day)}
                            </span>
                          </p>
                          <p className={cn("text-xs", active ? "text-slate-300" : "text-slate-500")}>
                            {formatNumber(d.orders, lang)} {S.dayOrders.toLowerCase()}
                            {d.day === todayKey && <span className="ms-2 font-bold text-orange-400">● {t.dashboard.todaySales}</span>}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-black">{d.revenue ? money(d.revenue) : "—"}</span>
                      </div>
                      <div className={cn("mt-2 h-1.5 overflow-hidden rounded-full", active ? "bg-white/15" : "bg-slate-200")}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(d.revenue / maxDay) * 100}%` }}
                          transition={{ duration: 0.8, delay: 0.1 }}
                          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-rose-500"
                        />
                      </div>
                    </button>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Orders of selected day */}
        <Card className="p-6 xl:col-span-3">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{S.orderHistory}</h2>
              <p className="text-sm text-slate-500">{dayLabel(selectedDay)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="slate">
                {S.showing}: {formatNumber(dayOrderCount, lang)}
              </Badge>
              <Badge tone="green">
                {S.grandTotal}: {money(dayRevenue)}
              </Badge>
            </div>
          </div>

          {!orders ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <EmptyState icon={<Receipt className="h-8 w-8" />} title={S.noSales} />
          ) : (
            <ul className="space-y-3">
              <AnimatePresence initial={false}>
                {orders.map((order, i) => {
                  const open = expanded === order.id;
                  return (
                    <motion.li
                      key={order.id}
                      layout
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                      className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200"
                    >
                      <button
                        onClick={() => setExpanded(open ? null : order.id)}
                        className="flex w-full items-center gap-4 p-4 text-start transition hover:bg-slate-50"
                      >
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 text-xs font-black text-white">
                          #{order.orderNumber}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-slate-900">{order.customerName || `${S.customer} · —`}</p>
                          <p className="text-xs text-slate-500">
                            {formatTime(order.createdAt, lang)} · {formatNumber(order.itemCount, lang)} {S.items.toLowerCase()}
                            {order.takenBy && <span> · {t.kitchen.by} {order.takenBy}</span>}
                          </p>
                        </div>
                        <div className="text-end">
                          <p className="font-black text-slate-900">{money(order.total)}</p>
                          <p className="text-[11px] font-semibold text-emerald-600">
                            {S.change}: {money(order.changeDue)}
                          </p>
                        </div>
                        <ChevronDown className={cn("h-5 w-5 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
                      </button>
                      <AnimatePresence initial={false}>
                        {open && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-2 border-t border-slate-100 bg-slate-50/70 p-4">
                              {order.items.map((line) => (
                                <div key={line.id} className="flex items-center justify-between text-sm">
                                  <span className="text-slate-700">
                                    <span className="font-bold">{line.quantity}×</span> {line.name}
                                  </span>
                                  <span className="font-semibold text-slate-900">{money(line.lineTotal)}</span>
                                </div>
                              ))}
                              <div className="mt-2 grid grid-cols-3 gap-2 border-t border-dashed border-slate-300 pt-3 text-center text-xs">
                                <div>
                                  <p className="text-slate-500">{S.total}</p>
                                  <p className="font-black">{money(order.total)}</p>
                                </div>
                                <div>
                                  <p className="text-slate-500">{S.received}</p>
                                  <p className="font-black">{money(order.amountReceived)}</p>
                                </div>
                                <div>
                                  <p className="text-slate-500">{S.change}</p>
                                  <p className="font-black text-emerald-600">{money(order.changeDue)}</p>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
