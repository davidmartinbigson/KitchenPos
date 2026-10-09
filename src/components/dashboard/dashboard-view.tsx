"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  CalendarDays,
  Receipt,
  ShoppingBasket,
  TrendingUp,
  UtensilsCrossed,
  Wallet,
  Flame,
} from "lucide-react";
import { useI18n } from "@/components/providers/language-provider";
import { AnimatedNumber } from "@/components/animated-number";
import { Badge, Button, Card, EmptyState, Skeleton, cn } from "@/components/ui";
import { formatMoney, formatNumber, formatTime, toLocalDateKey } from "@/lib/format";

type Stats = {
  today: { day: string; revenue: number; orders: number };
  totals: { revenue: number; orders: number; averageOrder: number; menuItems: number };
  daily: { day: string; revenue: number; orders: number }[];
  topItems: { name: string; quantity: number; revenue: number }[];
};

type RecentOrder = {
  id: number;
  orderNumber: number;
  customerName: string;
  total: number;
  itemCount: number;
  createdAt: string;
};

export function DashboardView({ currency, shopName }: { currency: string; shopName: string }) {
  const { t, lang } = useI18n();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentOrder[] | null>(null);

  useEffect(() => {
    const tz = new Date().getTimezoneOffset();
    const today = toLocalDateKey();
    fetch(`/api/stats?days=7&tz=${tz}&today=${today}`)
      .then((r) => r.json())
      .then((data: Stats) => setStats(data))
      .catch(() => setStats(null));
    fetch("/api/orders?limit=6")
      .then((r) => r.json())
      .then((data: { orders: RecentOrder[] }) => setRecent(data.orders ?? []))
      .catch(() => setRecent([]));
  }, []);

  const maxDaily = useMemo(
    () => Math.max(1, ...(stats?.daily.map((d) => d.revenue) ?? [1])),
    [stats],
  );

  const D = t.dashboard;
  const money = (n: number) => formatMoney(n, currency);

  const statCards = [
    {
      label: D.todaySales,
      value: stats?.today.revenue ?? 0,
      format: (n: number) => money(n),
      icon: Wallet,
      gradient: "from-orange-500 to-rose-500",
      sub: `${formatNumber(stats?.today.orders ?? 0, lang)} ${D.todayOrders.toLowerCase()}`,
    },
    {
      label: D.todayOrders,
      value: stats?.today.orders ?? 0,
      format: (n: number) => formatNumber(Math.round(n), lang),
      icon: Receipt,
      gradient: "from-emerald-500 to-teal-500",
      sub: stats?.today.day ?? "",
    },
    {
      label: D.totalRevenue,
      value: stats?.totals.revenue ?? 0,
      format: (n: number) => money(n),
      icon: TrendingUp,
      gradient: "from-sky-500 to-indigo-500",
      sub: `${formatNumber(stats?.totals.orders ?? 0, lang)} ${D.totalOrders.toLowerCase()}`,
    },
    {
      label: D.menuItems,
      value: stats?.totals.menuItems ?? 0,
      format: (n: number) => formatNumber(Math.round(n), lang),
      icon: UtensilsCrossed,
      gradient: "from-violet-500 to-fuchsia-500",
      sub: `${D.avgOrder}: ${money(stats?.totals.averageOrder ?? 0)}`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-2xl shadow-slate-900/30 sm:p-8"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 animate-blob rounded-full bg-orange-500/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-72 w-72 animate-blob rounded-full bg-rose-500/30 blur-3xl [animation-delay:-9s]" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-orange-300">
              <CalendarDays className="h-4 w-4" />
              {new Date().toLocaleDateString(lang === "ur" ? "ur-PK" : "en-US", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{shopName}</h1>
            <p className="mt-2 max-w-md text-slate-300">{D.overview}</p>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{D.todaySales}</p>
            <p className="text-4xl font-black tracking-tight sm:text-5xl">
              {stats ? (
                <AnimatedNumber value={stats.today.revenue} format={(n) => money(n)} />
              ) : (
                <span className="inline-block h-10 w-48 animate-pulse rounded-xl bg-white/10" />
              )}
            </p>
            <Link href="/pos">
              <Button size="lg" className="group">
                <ShoppingBasket className="h-5 w-5" />
                {D.goPos}
                <ArrowUpRight className="h-5 w-5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 rtl:rotate-180" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.section>

      {/* Stat cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.5 }}
            >
              <Card hover className="relative overflow-hidden p-5">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-semibold text-slate-500">{card.label}</p>
                  <span className={cn("grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg", card.gradient)}>
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
                <p className="mt-3 text-2xl font-black tracking-tight text-slate-900">
                  {stats ? <AnimatedNumber value={card.value} format={card.format} /> : <Skeleton className="h-8 w-32" />}
                </p>
                <p className="mt-1 truncate text-xs font-medium text-slate-500">{card.sub}</p>
              </Card>
            </motion.div>
          );
        })}
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Weekly chart */}
        <Card className="p-6 xl:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{D.last7Days}</h2>
              <p className="text-sm text-slate-500">{t.sales.dayRevenue}</p>
            </div>
            <Badge tone="green">{money(stats?.daily.reduce((s, d) => s + d.revenue, 0) ?? 0)}</Badge>
          </div>
          {!stats ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="flex h-64 items-end gap-2 sm:gap-4">
              {stats.daily.map((day, i) => {
                const pct = (day.revenue / maxDaily) * 100;
                const label = new Date(`${day.day}T00:00:00`).toLocaleDateString(
                  lang === "ur" ? "ur-PK" : "en-US",
                  { weekday: "short" },
                );
                const isToday = day.day === stats.today.day;
                return (
                  <div key={day.day} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <span className="text-[11px] font-bold text-slate-500 opacity-0 transition group-hover:opacity-100 sm:text-xs">
                      {day.revenue ? formatNumber(day.revenue, lang) : ""}
                    </span>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(pct, day.revenue > 0 ? 6 : 2)}%` }}
                      transition={{ delay: 0.3 + i * 0.07, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                      className={cn(
                        "w-full max-w-14 rounded-2xl shadow-lg transition group-hover:brightness-110",
                        isToday
                          ? "bg-gradient-to-t from-orange-500 to-rose-400 shadow-orange-500/30"
                          : "bg-gradient-to-t from-slate-300 to-slate-200 group-hover:from-orange-300 group-hover:to-orange-200",
                      )}
                    />
                    <span className={cn("text-xs font-semibold", isToday ? "text-orange-600" : "text-slate-500")}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Top items */}
        <Card className="p-6">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-slate-900">
            <Flame className="h-5 w-5 text-orange-500" /> {D.topItems}
          </h2>
          {!stats ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : stats.topItems.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">{D.noSalesData}</p>
          ) : (
            <ul className="space-y-3">
              {stats.topItems.map((item, i) => {
                const max = stats.topItems[0]?.quantity || 1;
                return (
                  <motion.li
                    key={item.name}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.08 }}
                  >
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="flex min-w-0 items-center gap-2 font-semibold text-slate-800">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-orange-100 text-xs font-black text-orange-700">
                          {i + 1}
                        </span>
                        <span className="truncate">{item.name}</span>
                      </span>
                      <span className="shrink-0 text-xs font-bold text-slate-500">
                        {formatNumber(item.quantity, lang)} {D.sold}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.quantity / max) * 100}%` }}
                        transition={{ delay: 0.4 + i * 0.1, duration: 0.9, ease: "easeOut" }}
                        className="h-full rounded-full bg-gradient-to-r from-orange-500 to-rose-500"
                      />
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Recent orders */}
      <Card className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{D.recentOrders}</h2>
          <Link href="/sales" className="text-sm font-bold text-orange-600 hover:underline">
            {t.sales.title} →
          </Link>
        </div>
        {!recent ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <EmptyState
            icon={<Receipt className="h-8 w-8" />}
            title={D.noOrders}
            action={
              <Link href="/pos">
                <Button>{D.goPos}</Button>
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((order) => (
              <li key={order.id} className="flex items-center gap-4 py-3.5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-900 text-sm font-black text-white">
                  #{order.orderNumber}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-800">
                    {order.customerName || t.pos.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatTime(order.createdAt, lang)} · {formatNumber(order.itemCount, lang)} {t.pos.item}
                  </p>
                </div>
                <span className="font-black text-slate-900">{formatMoney(order.total, currency)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Quick actions */}
      <section className="grid gap-4 sm:grid-cols-2">
        <Link href="/pos" className="group">
          <Card hover className="flex items-center gap-4 p-5">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/30 transition group-hover:rotate-6">
              <ShoppingBasket className="h-7 w-7" />
            </span>
            <div className="flex-1">
              <p className="font-bold text-slate-900">{t.nav.pos}</p>
              <p className="text-sm text-slate-500">{t.pos.subtitle}</p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-slate-400 transition group-hover:text-orange-500 rtl:rotate-180" />
          </Card>
        </Link>
        <Link href="/menu" className="group">
          <Card hover className="flex items-center gap-4 p-5">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30 transition group-hover:-rotate-6">
              <UtensilsCrossed className="h-7 w-7" />
            </span>
            <div className="flex-1">
              <p className="font-bold text-slate-900">{t.menu.addItem}</p>
              <p className="text-sm text-slate-500">{t.menu.subtitle}</p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-slate-400 transition group-hover:text-orange-500 rtl:rotate-180" />
          </Card>
        </Link>
      </section>
    </div>
  );
}
