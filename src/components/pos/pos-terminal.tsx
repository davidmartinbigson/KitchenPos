"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownCircle,
  BadgeCheck,
  CheckCircle2,
  CloudOff,
  Minus,
  Plus,
  Printer,
  Receipt as ReceiptIcon,
  RefreshCw,
  Search,
  ShoppingBasket,
  Sparkles,
  Trash2,
  UtensilsCrossed,
  Wifi,
  X,
  AlertTriangle,
} from "lucide-react";
import { useI18n } from "@/components/providers/language-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Button, Card, EmptyState, Input, Modal, cn, errorText } from "@/components/ui";
import { formatDate, formatMoney, formatNumber, formatTime } from "@/lib/format";
import { enqueueOrder, loadQueue, removeFromQueue, saveQueue, type QueuedOrder } from "@/lib/offline-queue";
import type { MenuItemDTO } from "@/lib/types";

type ReceiptData = {
  orderNumber: number | string;
  discount?: number;
  paymentMethod?: string;
  createdAt: string;
  customerName: string;
  shopName: string;
  sellerName: string;
  currency: string;
  lines: { name: string; qty: number; unitPrice: number; lineTotal: number; category: string }[];
  total: number;
  received: number;
  change: number;
  /** True when the order was saved on-device while offline. */
  pendingSync?: boolean;
};

const QUICK_NOTES = [100, 500, 1000, 2000, 5000];

/** Group receipt lines by category — one counter slip per category. */
function slipGroups(r: ReceiptData) {
  const map = new Map<string, { category: string; lines: ReceiptData["lines"]; qty: number }>();
  for (const line of r.lines) {
    const cat = line.category.trim() || "General";
    const group = map.get(cat) ?? { category: cat, lines: [], qty: 0 };
    group.lines.push(line);
    group.qty += line.qty;
    map.set(cat, group);
  }
  return [...map.values()];
}

export function PosTerminal({
  initialItems,
  currency,
  shopName,
  sellerName,
  readOnly = false,
  addons = {},
}: {
  initialItems: MenuItemDTO[];
  currency: string;
  shopName: string;
  sellerName?: string;
  readOnly?: boolean;
  addons?: Record<string, boolean>;
}) {
  const addOn = (key: string) => addons[key] === true;
  const { t, lang } = useI18n();
  const toast = useToast();
  const P = t.pos;

  const [items] = useState<MenuItemDTO[]>(initialItems);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [customer, setCustomer] = useState("");
  const [received, setReceived] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  // ── Offline-first state ──────────────────────────────────────────
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);

  const money = (n: number) => formatMoney(n, currency);

  /** Replay every queued order to the server, in the order they were taken. */
  const syncQueue = useCallback(async () => {
    if (syncingRef.current) return;
    const queue = loadQueue();
    if (queue.length === 0) {
      setPending(0);
      return;
    }
    syncingRef.current = true;
    setSyncing(true);

    let synced = 0;
    let failed = 0;
    for (const entry of queue) {
      try {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: entry.customerName,
            amountReceived: entry.amountReceived,
            items: entry.items,
            discount: entry.discount,
            paymentMethod: entry.paymentMethod,
          }),
        });
        if (res.ok) {
          removeFromQueue(entry.localId);
          synced += 1;
        } else {
          // Server rejected it (e.g. item removed while offline) — drop it.
          removeFromQueue(entry.localId);
          failed += 1;
        }
      } catch {
        // Still no internet — stop and retry on the next trigger.
        break;
      }
    }

    const left = loadQueue().length;
    setPending(left);
    syncingRef.current = false;
    setSyncing(false);

    if (synced > 0 && left === 0) {
      toast.show(P.syncedAll, "success");
    } else if (synced > 0) {
      toast.show(`${synced} ${P.syncedSome}`, "success");
    }
    if (failed > 0) {
      toast.show(P.syncFailed, "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track connectivity + auto-sync when the internet comes back.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- syncs browser connectivity state on mount */
    setOnline(navigator.onLine);
    setPending(loadQueue().length);
    /* eslint-enable react-hooks/set-state-in-effect */

    const onOnline = () => {
      setOnline(true);
      toast.show(P.youAreOnline, "success");
      void syncQueue();
    };
    const onOffline = () => setOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const timer = setInterval(() => {
      if (navigator.onLine && loadQueue().length > 0) void syncQueue();
    }, 30_000);

    // If the page loaded while online with a stale queue, flush it now.
    if (navigator.onLine) void syncQueue();

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncQueue]);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(items.map((i) => i.category))).sort()],
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchCat = category === "all" || item.category === category;
      const matchQ =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [items, query, category]);

  const lines = useMemo(
    () =>
      items
        .filter((i) => cart[i.id] > 0)
        .map((i) => ({ item: i, qty: cart[i.id], lineTotal: i.price * cart[i.id] })),
    [items, cart],
  );

  const [discType, setDiscType] = useState<"percent" | "flat">("percent");
  const [discValue, setDiscValue] = useState("");
  const [payMethod, setPayMethod] = useState("cash");

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const discountAmount = !addOn("discounts")
    ? 0
    : discType === "percent"
      ? Math.min(subtotal, Math.max(0, Math.round((subtotal * (Number(discValue) || 0)) / 100)))
      : Math.min(subtotal, Math.max(0, Math.round(Number(discValue) || 0)));
  const total = subtotal - discountAmount;
  const itemCount = lines.reduce((sum, l) => sum + l.qty, 0);
  const receivedNum = received.trim() === "" ? total : Math.round(Number(received));
  const validReceived = Number.isFinite(receivedNum);
  const change = validReceived ? Math.max(0, receivedNum - total) : 0;
  const balance = validReceived ? Math.max(0, total - receivedNum) : total;
  const enoughCash = validReceived && receivedNum >= total;
  const canSubmit = lines.length > 0 && enoughCash && !submitting;

  function addItem(id: number) {
    setCart((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  }

  function changeQty(id: number, delta: number) {
    setCart((prev) => {
      const next = (prev[id] ?? 0) + delta;
      const copy = { ...prev };
      if (next <= 0) delete copy[id];
      else copy[id] = Math.min(next, 99);
      return copy;
    });
  }

  function removeLine(id: number) {
    setCart((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }

  function resetOrder() {
    setCart({});
    setCustomer("");
    setReceived("");
  }

  function addCash(amount: number) {
    const base = received.trim() === "" ? 0 : Number(received) || 0;
    setReceived(String(base + amount));
  }

  /** Save the order on-device so the cashier can keep selling without internet. */
  function checkoutOffline(message?: string) {
    const queue = enqueueOrder({
      customerName: customer.trim(),
      amountReceived: receivedNum,
      items: lines.map((l) => ({ menuItemId: l.item.id, quantity: l.qty })),
      discount: addOn("discounts") ? { type: discType, value: Number(discValue) || 0 } : undefined,
      paymentMethod: addOn("payments") ? payMethod : undefined,
    });
    setPending(queue.length);
    setReceipt({
      orderNumber: `OFF-${queue.length}`,
      createdAt: new Date().toISOString(),
      customerName: customer.trim(),
      shopName,
      sellerName: sellerName ?? "",
      currency,
      lines: lines.map((l) => ({ name: l.item.name, qty: l.qty, unitPrice: l.item.price, lineTotal: l.lineTotal, category: l.item.category || "General" })),
      total,
      received: receivedNum,
      change: Math.max(0, receivedNum - total),
      pendingSync: true,
    });
    resetOrder();
    toast.show(message ?? P.orderQueued, "success");
    setSubmitting(false);
  }

  async function checkout() {
    if (!canSubmit) {
      if (!enoughCash && lines.length > 0) toast.show(P.insufficient, "error");
      return;
    }
    // No internet at all → store on device, keep the counter running.
    if (!online) {
      checkoutOffline();
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customer,
          amountReceived: receivedNum,
          items: lines.map((l) => ({ menuItemId: l.item.id, quantity: l.qty })),
          discount: addOn("discounts") ? { type: discType, value: Number(discValue) || 0 } : undefined,
          paymentMethod: addOn("payments") ? payMethod : undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        order?: {
          orderNumber: number;
          dailyOrderNo?: number;
          createdAt: string;
          total: number;
          amountReceived: number;
          changeDue: number;
          discountAmount?: number;
          paymentMethod?: string;
        };
        displayOrderNo?: number;
      };
      if (!res.ok || !data.order) {
        toast.show(errorText(data.error, t), "error");
        setSubmitting(false);
        return;
      }
      setReceipt({
        orderNumber: data.displayOrderNo ?? data.order.orderNumber,
        createdAt: data.order.createdAt,
        customerName: customer.trim(),
        shopName,
        sellerName: sellerName ?? "",
        currency,
        lines: lines.map((l) => ({ name: l.item.name, qty: l.qty, unitPrice: l.item.price, lineTotal: l.lineTotal, category: l.item.category || "General" })),
        total: data.order.total,
        received: data.order.amountReceived,
        change: data.order.changeDue,
        discount: data.order.discountAmount ?? 0,
        paymentMethod: data.order.paymentMethod ?? "cash",
      });
      resetOrder();
      toast.show(P.orderSaved, "success");
      setSubmitting(false);
    } catch {
      // Internet died mid-checkout → queue it instead of losing the sale.
      checkoutOffline();
    }
  }

  const hasMenu = items.length > 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-black tracking-tight text-slate-950">{P.title}</h1>
        <p className="text-slate-600">{P.subtitle}</p>
      </header>

      {/* Offline / pending-sync banner */}
      <AnimatePresence>
        {(!online || pending > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={cn(
              "flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 ring-1",
              !online
                ? "bg-amber-50 text-amber-800 ring-amber-200"
                : "bg-sky-50 text-sky-800 ring-sky-200",
            )}
          >
            <div className="flex items-center gap-3">
              <span className={cn(
                "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                !online ? "bg-amber-100 text-amber-600" : "bg-sky-100 text-sky-600",
              )}>
                {online ? <RefreshCw className={cn("h-5 w-5", syncing && "animate-spin")} /> : <CloudOff className="h-5 w-5" />}
              </span>
              <div>
                <p className="text-sm font-black">
                  {online ? (syncing ? P.syncing : P.youAreOnline) : P.offlineMode}
                </p>
                <p className="text-xs font-semibold opacity-80">
                  {pending > 0 ? `${formatNumber(pending, lang)} ${P.pendingSync} · ` : ""}
                  {!online && P.offlineHint}
                </p>
              </div>
            </div>
            {online && pending > 0 && (
              <Button size="sm" variant="secondary" onClick={() => void syncQueue()} disabled={syncing}>
                <Wifi className="h-4 w-4" /> {P.syncing}
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!hasMenu ? (
        <EmptyState
          icon={<UtensilsCrossed className="h-8 w-8" />}
          title={P.noMenu}
          description={readOnly ? undefined : P.addFirst}
          action={
            readOnly ? undefined : (
              <Link href="/menu">
                <Button>{t.menu.addItem}</Button>
              </Link>
            )
          }
        />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_400px]">
          {/* Menu grid */}
          <section className="min-w-0 space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.search}
                  className="ps-12"
                />
              </div>
            </div>

            <div className="scroll-thin -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "relative shrink-0 rounded-2xl px-4 py-2 text-sm font-semibold transition",
                    category === cat
                      ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:text-slate-900",
                  )}
                >
                  {cat === "all" ? t.menu.allCategories : cat}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <p className="py-16 text-center text-slate-500">{P.emptyFilter}</p>
            ) : (
              <motion.div layout className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                <AnimatePresence mode="popLayout">
                  {filtered.map((item, i) => {
                    const qty = cart[item.id] ?? 0;
                    const soldOut = addOn("stock") && item.stockQty != null && item.stockQty <= 0;
                    return (
                      <motion.button
                        layout
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: Math.min(i * 0.02, 0.3), duration: 0.35 }}
                        whileTap={item.available ? { scale: 0.95 } : undefined}
                        onClick={() => item.available && !soldOut && addItem(item.id)}
                        disabled={!item.available || soldOut}
                        className={cn(
                          "group relative flex flex-col overflow-hidden rounded-3xl bg-white text-start shadow-[0_8px_30px_-12px_rgba(15,23,42,0.25)] ring-1 transition-all duration-300",
                          qty > 0 ? "ring-2 ring-orange-400" : "ring-slate-100",
                          item.available
                            ? "hover:-translate-y-1 hover:shadow-[0_18px_40px_-12px_rgba(249,115,22,0.35)]"
                            : "opacity-50 grayscale",
                        )}
                      >
                        <div className="relative h-28 w-full overflow-hidden bg-gradient-to-br from-orange-100 via-amber-50 to-rose-100 sm:h-32">
                          {item.imageData ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.imageData}
                              alt={item.name}
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                            />
                          ) : (
                            <span className="grid h-full w-full place-items-center text-5xl transition duration-500 group-hover:scale-110">
                              {item.emoji}
                            </span>
                          )}
                          {qty > 0 && (
                            <motion.span
                              key={qty}
                              initial={{ scale: 0.4 }}
                              animate={{ scale: 1 }}
                              className="absolute end-2 top-2 grid h-8 min-w-8 place-items-center rounded-full bg-gradient-to-br from-orange-500 to-rose-500 px-2 text-sm font-black text-white shadow-lg"
                            >
                              {qty}
                            </motion.span>
                          )}
                          {!item.available && (
                            <span className="absolute start-2 top-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[11px] font-bold text-white">
                              {t.menu.unavailable}
                            </span>
                          )}
                          {soldOut && (
                            <span className="absolute end-2 bottom-2 rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-bold text-white">
                              {P.soldOut}
                            </span>
                          )}
                          {addOn("stock") && item.stockQty != null && item.stockQty > 0 && item.stockQty <= 10 && (
                            <span className="absolute end-2 bottom-2 rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white">
                              {item.stockQty} {P.stockLeft}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col gap-1 p-3.5">
                          <p className="line-clamp-1 font-bold text-slate-900">{item.name}</p>
                          <p className="line-clamp-1 text-xs text-slate-500">{item.category}</p>
                          <p className="mt-auto pt-1 text-base font-black text-orange-600">{money(item.price)}</p>
                        </div>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            )}
          </section>

          {/* Order panel */}
          <aside id="order-panel" className="lg:sticky lg:top-6">
            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between bg-gradient-to-r from-slate-950 to-slate-800 px-5 py-4 text-white">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10">
                    <ShoppingBasket className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-bold">{P.cart}</p>
                    <p className="text-xs text-slate-300">
                      {formatNumber(itemCount, lang)} {P.itemsInCart}
                    </p>
                  </div>
                </div>
                {lines.length > 0 && (
                  <button
                    onClick={resetOrder}
                    className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> {P.clear}
                  </button>
                )}
              </div>

              <div className="space-y-4 p-5">
                <Input
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  placeholder={P.customerName}
                  maxLength={100}
                />

                {/* Line items */}
                <div className="scroll-thin max-h-72 min-h-[7rem] space-y-2.5 overflow-y-auto pe-1">
                  {lines.length === 0 ? (
                    <div className="grid h-28 place-items-center rounded-2xl border-2 border-dashed border-slate-200 text-center text-sm text-slate-500">
                      <p className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-orange-400" /> {P.emptyCart}
                      </p>
                    </div>
                  ) : (
                    <AnimatePresence initial={false}>
                      {lines.map((line) => (
                        <motion.div
                          key={line.item.id}
                          layout
                          initial={{ opacity: 0, height: 0, y: -8 }}
                          animate={{ opacity: 1, height: "auto", y: 0 }}
                          exit={{ opacity: 0, height: 0, x: 40 }}
                          transition={{ type: "spring", stiffness: 320, damping: 30 }}
                          className="flex items-center gap-3 overflow-hidden rounded-2xl bg-slate-50 p-2.5"
                        >
                          <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-white text-2xl shadow-sm">
                            {line.item.imageData ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={line.item.imageData} alt="" className="h-full w-full object-cover" />
                            ) : (
                              line.item.emoji
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-800">{line.item.name}</p>
                            <p className="text-xs text-slate-500">{money(line.item.price)}</p>
                          </div>
                          <div className="flex items-center gap-1 rounded-xl bg-white p-1 shadow-sm">
                            <button
                              aria-label="-"
                              onClick={() => changeQty(line.item.id, -1)}
                              className="grid h-7 w-7 place-items-center rounded-lg text-slate-600 transition hover:bg-slate-100"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-7 text-center text-sm font-black">{line.qty}</span>
                            <button
                              aria-label="+"
                              onClick={() => changeQty(line.item.id, 1)}
                              className="grid h-7 w-7 place-items-center rounded-lg text-slate-600 transition hover:bg-slate-100"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="w-16 text-end">
                            <p className="text-sm font-black text-slate-900">{formatNumber(line.lineTotal, lang)}</p>
                            <button
                              onClick={() => removeLine(line.item.id)}
                              className="text-[11px] font-semibold text-rose-500 hover:underline"
                            >
                              {P.remove}
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>

                {/* Totals */}
                <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 p-4 text-white shadow-lg shadow-orange-500/30">
                  <div className="flex items-center justify-between text-sm font-semibold text-orange-50">
                    <span>{P.subtotal}</span>
                    <span>{money(total)}</span>
                  </div>
                  <div className="mt-1 flex items-end justify-between">
                    <span className="text-lg font-bold">{P.total}</span>
                    <motion.span
                      key={total}
                      initial={{ scale: 0.9, opacity: 0.5 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-3xl font-black tracking-tight"
                    >
                      {money(total)}
                    </motion.span>
                  </div>
                </div>

                {/* Payment */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700" htmlFor="received">
                    {P.amountReceived}
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                      {currency}
                    </span>
                    <Input
                      id="received"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={received}
                      onChange={(e) => setReceived(e.target.value)}
                      placeholder={String(total)}
                      className="ps-14 text-lg font-bold"
                    />
                  </div>
                  <div className="scroll-thin mt-2.5 flex gap-2 overflow-x-auto pb-1">
                    <button
                      onClick={() => setReceived(String(total))}
                      disabled={lines.length === 0}
                      className="shrink-0 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-slate-700 disabled:opacity-40"
                    >
                      {P.exact}
                    </button>
                    {QUICK_NOTES.map((note) => (
                      <button
                        key={note}
                        onClick={() => addCash(note)}
                        className="shrink-0 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-orange-50 hover:text-orange-700 hover:ring-orange-200"
                      >
                        +{formatNumber(note, lang)}
                      </button>
                    ))}
                    <button
                      onClick={() => setReceived("")}
                      className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-slate-100"
                    >
                      <X className="inline h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Add-on: checkout discount */}
                {addOn("discounts") && (
                  <div className="rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200">
                    <p className="text-xs font-bold text-amber-700">{P.discount}</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDiscType("percent")}
                        className={cn(
                          "rounded-xl px-3 py-1.5 text-xs font-bold ring-1 transition",
                          discType === "percent"
                            ? "bg-amber-600 text-white ring-amber-600"
                            : "bg-white text-slate-600 ring-slate-200",
                        )}
                      >
                        {P.discPercent}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscType("flat")}
                        className={cn(
                          "rounded-xl px-3 py-1.5 text-xs font-bold ring-1 transition",
                          discType === "flat"
                            ? "bg-amber-600 text-white ring-amber-600"
                            : "bg-white text-slate-600 ring-slate-200",
                        )}
                      >
                        {P.discFlat}
                      </button>
                      <Input
                        type="number"
                        min={0}
                        value={discValue}
                        onChange={(e) => setDiscValue(e.target.value)}
                        placeholder={discType === "percent" ? "10%" : "50"}
                        className="h-9 flex-1"
                      />
                      {discountAmount > 0 && (
                        <span className="self-center text-xs font-bold text-amber-700">
                          −{money(discountAmount)}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Add-on: payment method */}
                {addOn("payments") && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">{P.payMethod}</span>
                    <div className="flex flex-1 flex-wrap gap-1.5">
                      {(["cash", "card", "jazzcash", "easypaisa", "bank"] as const).map((m) => (
                        <button
                          type="button"
                          key={m}
                          onClick={() => setPayMethod(m)}
                          className={cn(
                            "rounded-xl px-3 py-1.5 text-xs font-bold ring-1 transition",
                            payMethod === m
                              ? "bg-slate-900 text-white ring-slate-900"
                              : "bg-white text-slate-600 ring-slate-200 hover:ring-orange-300",
                          )}
                        >
                          {P.methods[m]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Change / balance */}
                <motion.div
                  layout
                  className={cn(
                    "flex items-center justify-between rounded-2xl p-4 ring-1",
                    lines.length === 0
                      ? "bg-slate-50 ring-slate-200"
                      : enoughCash
                        ? "bg-emerald-50 ring-emerald-200"
                        : "bg-rose-50 ring-rose-200",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    {enoughCash || lines.length === 0 ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="h-6 w-6 text-rose-500" />
                    )}
                    <div>
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          enoughCash || lines.length === 0 ? "text-emerald-700" : "text-rose-600",
                        )}
                      >
                        {enoughCash ? P.change : P.balanceDue}
                      </p>
                      <p className="text-xs text-slate-500">
                        {lines.length === 0 ? P.emptyCart : enoughCash ? (change === 0 ? P.paidInFull : P.change) : P.insufficient}
                      </p>
                    </div>
                  </div>
                  <motion.p
                    key={`${change}-${balance}`}
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={cn(
                      "text-2xl font-black tracking-tight",
                      enoughCash || lines.length === 0 ? "text-emerald-700" : "text-rose-600",
                    )}
                  >
                    {enoughCash ? money(change) : money(balance)}
                  </motion.p>
                </motion.div>

                <Button
                  size="lg"
                  variant="success"
                  className="w-full"
                  disabled={!canSubmit}
                  loading={submitting}
                  onClick={checkout}
                >
                  {submitting ? P.processing : (
                    <>
                      <BadgeCheck className="h-5 w-5" /> {P.placeOrder}
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </aside>
        </div>
      )}

      {/* Receipt */}
      <Modal
        open={Boolean(receipt)}
        onClose={() => setReceipt(null)}
        title={P.receiptTitle}
        footer={
          <div className="space-y-2">
            <p className="text-center text-xs text-slate-500">{P.printHint}</p>
            <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> {P.print}
            </Button>
            <Button className="flex-1" onClick={() => setReceipt(null)}>
              <ReceiptIcon className="h-4 w-4" /> {P.newOrder}
            </Button>
            </div>
          </div>
        }
      >
        {receipt && (
          <motion.div
            id="receipt-print"
            initial={{ opacity: 0, y: 20, rotate: -1 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="mx-auto max-w-xs rounded-2xl bg-white p-5 font-mono text-[13px] text-slate-800 shadow-inner ring-1 ring-slate-200"
          >
            <div className="text-center">
              <p className="text-base font-black uppercase tracking-wide">{receipt.shopName}</p>
              <p className="text-[11px] text-slate-500">
                {formatDate(receipt.createdAt, lang)} · {formatTime(receipt.createdAt, lang)}
              </p>
              <p className="mt-1 text-xs font-bold">
                {P.orderNo}
                {receipt.orderNumber}
              </p>
              {receipt.pendingSync && (
                <p className="mt-1 rounded-lg bg-amber-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-amber-700">
                  {P.receiptPending}
                </p>
              )}
              {receipt.customerName && <p className="text-xs">{receipt.customerName}</p>}
              {receipt.sellerName && (
                <p className="text-xs text-slate-500">
                  {P.by} {receipt.sellerName}
                </p>
              )}
            </div>
            <div className="my-3 border-t border-dashed border-slate-300" />
            <div className="space-y-1.5">
              {receipt.lines.map((line) => (
                <div key={line.name} className="flex justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate">
                    {line.qty} × {line.name}
                  </span>
                  <span className="shrink-0">{formatNumber(line.lineTotal, lang)}</span>
                </div>
              ))}
            </div>
            <div className="my-3 border-t border-dashed border-slate-300" />
            {(receipt.discount ?? 0) > 0 && (
              <div className="flex justify-between text-xs font-semibold text-amber-700">
                <span>{P.discount}</span>
                <span>−{money(receipt.discount ?? 0)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black">
              <span>{P.totalLabel}</span>
              <span>{money(receipt.total)}</span>
            </div>
            {receipt.paymentMethod && receipt.paymentMethod !== "cash" && (
              <div className="mt-1 flex justify-between text-xs">
                <span>{P.payMethod}</span>
                <span className="font-bold uppercase">{receipt.paymentMethod}</span>
              </div>
            )}
            <div className="mt-1 flex justify-between text-xs">
              <span>{P.received}</span>
              <span>{money(receipt.received)}</span>
            </div>
            <div className="mt-1 flex justify-between text-xs font-bold text-emerald-700">
              <span>{P.changeLabel}</span>
              <span>{money(receipt.change)}</span>
            </div>
            <div className="my-3 border-t border-dashed border-slate-300" />
            <p className="text-center text-[11px] text-slate-500">{P.thankYou}</p>
          </motion.div>
        )}
      </Modal>

      {/* Print sheet — one counter slip per category, then the full customer receipt */}
      {receipt && (
        <div id="print-sheet" aria-hidden="true">
          {slipGroups(receipt).map((group, index, groups) => (
            <div key={group.category} className="print-slip">
              <p className="ps-shop">{receipt.shopName}</p>
              <p className="ps-label">{P.counterSlip}</p>
              <p className="ps-category">{group.category}</p>
              <p className="ps-meta">
                {P.orderNo}
                {receipt.orderNumber} · {formatDate(receipt.createdAt, lang)} ·{" "}
                {formatTime(receipt.createdAt, lang)}
              </p>
              {receipt.customerName && <p className="ps-meta">{receipt.customerName}</p>}
              <div className="ps-div" />
              {group.lines.map((line) => (
                <p key={`${group.category}-${line.name}`} className="ps-line">
                  {formatNumber(line.qty, lang)} × {line.name}
                </p>
              ))}
              <div className="ps-div" />
              <p className="ps-meta">
                {P.qty}: {formatNumber(group.qty, lang)} · {formatNumber(index + 1, lang)}/
                {formatNumber(groups.length + 1, lang)}
              </p>
            </div>
          ))}
          <div className="print-slip">
            <p className="ps-shop">{receipt.shopName}</p>
            <p className="ps-label">{P.customerCopy}</p>
            <p className="ps-meta">
              {P.orderNo}
              {receipt.orderNumber} · {formatDate(receipt.createdAt, lang)} ·{" "}
              {formatTime(receipt.createdAt, lang)}
            </p>
            {receipt.customerName && <p className="ps-meta">{receipt.customerName}</p>}
            {receipt.sellerName && (
              <p className="ps-meta">
                {P.by} {receipt.sellerName}
              </p>
            )}
            <div className="ps-div" />
            {receipt.lines.map((line) => (
              <div key={`customer-${line.category}-${line.name}`} className="ps-line ps-split">
                <span>
                  {formatNumber(line.qty, lang)} × {line.name}
                </span>
                <span>{formatNumber(line.lineTotal, lang)}</span>
              </div>
            ))}
            <div className="ps-div" />
            <div className="ps-line ps-split ps-total">
              <span>{P.totalLabel}</span>
              <span>{money(receipt.total)}</span>
            </div>
            <div className="ps-line ps-split">
              <span>{P.received}</span>
              <span>{money(receipt.received)}</span>
            </div>
            <div className="ps-line ps-split ps-change">
              <span>{P.changeLabel}</span>
              <span>{money(receipt.change)}</span>
            </div>
            <div className="ps-div" />
            <p className="ps-meta">{P.thankYou}</p>
          </div>
        </div>
      )}

      {/* Mobile floating total bar */}
      {hasMenu && lines.length > 0 && (
        <motion.button
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          onClick={() => document.getElementById("order-panel")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className="fixed inset-x-3 bottom-24 z-20 flex items-center justify-between rounded-2xl bg-slate-950 px-5 py-3.5 text-white shadow-2xl lg:hidden"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <ArrowDownCircle className="h-5 w-5 text-orange-400" />
            {formatNumber(itemCount, lang)} {P.itemsInCart}
          </span>
          <span className="text-base font-black">{money(total)}</span>
        </motion.button>
      )}

    </div>
  );
}
