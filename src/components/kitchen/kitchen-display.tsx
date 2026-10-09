"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlarmClock,
  BellRing,
  CheckCircle2,
  ChefHat,
  CookingPot,
  Flame,
  LogOut,
  RefreshCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useI18n } from "@/components/providers/language-provider";
import { LanguageToggle } from "@/components/language-toggle";
import { Button, cn } from "@/components/ui";
import { formatNumber } from "@/lib/format";

type KitchenItem = {
  id: number;
  name: string;
  quantity: number;
  category: string;
  status: "new" | "preparing" | "ready";
};

type KitchenOrder = {
  id: number;
  orderNumber: number;
  customerName: string;
  takenBy: string;
  createdAt: string;
  items: KitchenItem[];
};

type FeedScope = { role: string; categories: string[] };

const POLL_MS = 6000;

function playChime() {
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.22, now + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.4);
    });
    setTimeout(() => ctx.close(), 1400);
  } catch {
    /* audio blocked */
  }
}

export function KitchenDisplay({
  viewerRole,
  viewerName,
  categories,
  shopName,
}: {
  viewerRole: "owner" | "chef";
  viewerName: string;
  categories: string[];
  shopName: string;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const K = t.kitchen;

  const [orders, setOrders] = useState<KitchenOrder[] | null>(null);
  const [, setTick] = useState(0);
  const [sound, setSound] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [pendingItems, setPendingItems] = useState<Set<number>>(new Set());
  const seenIds = useRef<Set<number>>(new Set());
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/kitchen", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { orders: KitchenOrder[]; scope: FeedScope };
      const feed = data.orders ?? [];

      const currentIds = new Set(feed.flatMap((o) => o.items.map((i) => i.id)));
      if (seenIds.current.size > 0) {
        const hasFresh = [...currentIds].some((id) => !seenIds.current.has(id));
        if (hasFresh && sound) playChime();
      }
      seenIds.current = currentIds;
      setOrders(feed);
      setLastSync(new Date());
    } catch {
      /* keep old data */
    }
  }, [sound]);

  useEffect(() => {
    load();
    timer.current = setInterval(load, POLL_MS);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    const tickTimer = setInterval(() => setTick((v) => v + 1), 30_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(tickTimer);
      if (timer.current) clearInterval(timer.current);
    };
  }, [load]);

  async function moveItems(itemIds: number[], status: KitchenItem["status"]) {
    setPendingItems((prev) => new Set([...prev, ...itemIds]));
    // Optimistic UI
    setOrders((prev) =>
      prev
        ? prev.map((order) => ({
            ...order,
            items: order.items.map((item) =>
              itemIds.includes(item.id) ? { ...item, status } : item,
            ),
          }))
        : prev,
    );
    await fetch("/api/kitchen", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemIds, status }),
    });
    setPendingItems((prev) => {
      const next = new Set(prev);
      itemIds.forEach((id) => next.delete(id));
      return next;
    });
    load();
  }

  function minutesAgo(createdAt: string) {
    return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000));
  }

  const columns = useMemo(() => {
    const list: { key: KitchenItem["status"]; title: string; empty: string; accent: string; ring: string; icon: typeof Flame }[] = [
      { key: "new", title: K.new, empty: K.emptyNew, accent: "text-sky-300", ring: "ring-sky-400/40 bg-sky-400/10", icon: BellRing },
      { key: "preparing", title: K.cooking, empty: K.emptyCooking, accent: "text-amber-300", ring: "ring-amber-400/40 bg-amber-400/10", icon: Flame },
      { key: "ready", title: K.readyCol, empty: K.emptyReady, accent: "text-emerald-300", ring: "ring-emerald-400/40 bg-emerald-400/10", icon: CheckCircle2 },
    ];
    if (!orders) return list.map((c) => ({ ...c, orders: [] as KitchenOrder[] }));
    return list.map((column) => ({
      ...column,
      orders: orders.filter((order) => order.items.some((item) => item.status === column.key)),
    }));
  }, [orders, K]);

  const totalActive = useMemo(
    () => (orders ? orders.reduce((s, o) => s + o.items.filter((i) => i.status !== "ready").length, 0) : 0),
    [orders],
  );

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 opacity-60">
        <div className="absolute -top-24 left-10 h-96 w-96 animate-blob rounded-full bg-orange-600/20 blur-3xl" />
        <div className="absolute bottom-0 right-10 h-96 w-96 animate-blob rounded-full bg-rose-600/15 blur-3xl [animation-delay:-8s]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex flex-wrap items-center gap-4 border-b border-white/10 px-4 py-4 sm:px-8">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 shadow-lg shadow-orange-500/30 animate-pulse-soft">
          <CookingPot className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-3 text-xl font-black tracking-tight sm:text-2xl">
            {shopName} · {K.title}
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-bold text-emerald-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Live
            </span>
          </h1>
          <p className="truncate text-sm text-slate-400">
            <ChefHat className="me-1 inline h-4 w-4" /> {viewerName}
            {viewerRole === "chef" && (
              <span className="ms-2 text-slate-500">
                · {K.yourCategories}: {categories.length === 0 ? K.allCategories : categories.join(", ")}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs font-semibold text-slate-500 sm:block">
            {lastSync ? lastSync.toLocaleTimeString(lang === "ur" ? "ur-PK" : "en-US", { hour: "2-digit", minute: "2-digit" }) : "…"}
          </span>
          <button
            onClick={() => setSound((v) => !v)}
            title={K.sound}
            className={cn(
              "grid h-10 w-10 place-items-center rounded-xl ring-1 transition",
              sound ? "bg-orange-500/20 text-orange-300 ring-orange-400/40" : "bg-white/5 text-slate-400 ring-white/10",
            )}
          >
            {sound ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </button>
          <button
            onClick={load}
            title={K.refresh}
            className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-slate-300 ring-1 ring-white/10 transition hover:bg-white/10"
          >
            <RefreshCcw className="h-5 w-5" />
          </button>
          <LanguageToggle compact className="!bg-white/5 !ring-white/10" />
          <button
            onClick={logout}
            title={t.logout}
            className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-rose-300 ring-1 ring-white/10 transition hover:bg-rose-500/20"
          >
            <LogOut className="h-5 w-5 rtl:rotate-180" />
          </button>
        </div>
      </header>

      {/* Board */}
      <main className="relative z-10 grid gap-4 p-4 sm:p-6 md:grid-cols-3 lg:gap-5 lg:p-8">
        {columns.map((column) => {
          const Icon = column.icon;
          const count = column.orders.reduce(
            (s, o) => s + o.items.filter((i) => i.status === column.key).length,
            0,
          );
          return (
            <section key={column.key} className="flex min-h-[60vh] flex-col rounded-3xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur">
              <div className="mb-4 flex items-center gap-2.5">
                <span className={cn("grid h-10 w-10 place-items-center rounded-xl ring-1", column.ring, column.accent)}>
                  <Icon className="h-5 w-5" />
                </span>
                <h2 className="text-lg font-black">{column.title}</h2>
                <span className="ms-auto rounded-full bg-white/10 px-3 py-1 text-sm font-black">{formatNumber(count, lang)}</span>
              </div>

              <div className="scroll-thin flex-1 space-y-3 overflow-y-auto pe-1">
                <AnimatePresence initial={false}>
                  {column.orders.map((order) => {
                    const scoped = order.items.filter((i) => i.status === column.key);
                    const mins = minutesAgo(order.createdAt);
                    const late = mins >= 15 && column.key !== "ready";
                    return (
                      <motion.article
                        key={`${order.id}-${column.key}`}
                        layout
                        initial={{ opacity: 0, y: 24, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 280, damping: 26 }}
                        className={cn(
                          "rounded-2xl border p-4 shadow-xl",
                          late
                            ? "border-rose-400/50 bg-rose-500/10"
                            : column.key === "new"
                              ? "border-sky-400/30 bg-sky-500/[0.07]"
                              : column.key === "preparing"
                                ? "border-amber-400/30 bg-amber-500/[0.06]"
                                : "border-emerald-400/20 bg-emerald-500/[0.05]",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="rounded-lg bg-white/10 px-2.5 py-1 text-sm font-black">
                            #{order.orderNumber}
                          </span>
                          <span className={cn("flex items-center gap-1 text-xs font-bold", late ? "text-rose-300" : "text-slate-400")}>
                            <AlarmClock className="h-3.5 w-3.5" />
                            {mins === 0 ? K.justNow : `${formatNumber(mins, lang)} ${K.min}`}
                            {late && ` · ${K.late}`}
                          </span>
                        </div>
                        <p className="mt-2 truncate text-xs text-slate-400">
                          {order.customerName || K.customer}
                          {order.takenBy && <span> · {K.by} {order.takenBy}</span>}
                        </p>

                        <ul className="mt-3 space-y-2">
                          {scoped.map((item) => (
                            <li key={item.id} className="flex items-center gap-2">
                              <button
                                disabled={pendingItems.has(item.id)}
                                onClick={() =>
                                  item.status === "new"
                                    ? moveItems([item.id], "preparing")
                                    : item.status === "preparing"
                                      ? moveItems([item.id], "ready")
                                      : undefined
                                }
                                className={cn(
                                  "flex flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-start transition",
                                  item.status === "new"
                                    ? "bg-sky-400/15 hover:bg-sky-400/25"
                                    : item.status === "preparing"
                                      ? "bg-amber-400/15 hover:bg-amber-400/25"
                                      : "bg-emerald-400/10",
                                  pendingItems.has(item.id) && "opacity-50",
                                )}
                              >
                                <span className="grid h-9 min-w-9 place-items-center rounded-lg bg-black/30 px-2 text-base font-black">
                                  {item.quantity}×
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate font-bold">{item.name}</span>
                                  <span className="block truncate text-xs text-slate-400">{item.category}</span>
                                </span>
                                {item.status === "new" && <span className="text-xs font-black text-sky-300">{K.start}</span>}
                                {item.status === "preparing" && <span className="text-xs font-black text-amber-300">{K.markReady}</span>}
                                {item.status === "ready" && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                              </button>
                            </li>
                          ))}
                        </ul>

                        {column.key !== "ready" && scoped.length > 1 && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="!mt-3 w-full !bg-white/10 !text-white !ring-white/15 hover:!bg-white/20"
                            onClick={() =>
                              moveItems(scoped.map((i) => i.id), column.key === "new" ? "preparing" : "ready")
                            }
                          >
                            {K.bumpAll}
                          </Button>
                        )}
                      </motion.article>
                    );
                  })}
                </AnimatePresence>
                {column.orders.length === 0 && (
                  <div className="grid h-28 place-items-center rounded-2xl border border-dashed border-white/10 text-sm text-slate-500">
                    {column.empty}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </main>

      {!orders && (
        <div className="grid place-items-center py-20 text-slate-400">{t.loading}</div>
      )}
      {orders && totalActive === 0 && (
        <p className="relative z-10 px-6 pb-10 text-center text-sm text-slate-500">{K.allCaughtUp}</p>
      )}
    </div>
  );
}
