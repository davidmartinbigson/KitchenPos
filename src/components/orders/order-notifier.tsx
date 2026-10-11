"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing, Check, Printer, QrCode, X } from "lucide-react";
import { Badge, Button, Modal, cn } from "@/components/ui";
import { useI18n } from "@/components/providers/language-provider";
import { formatDate, formatNumber, formatTime } from "@/lib/format";

type NotifierItem = {
  id: number;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  category: string;
  status: string;
};

type NotifierOrder = {
  id: number;
  orderNumber: number;
  dailyOrderNo: number;
  customerName: string;
  takenBy: string;
  total: number;
  amountReceived: number;
  changeDue: number;
  createdAt: string;
  completedAt: string | null;
  voidedAt: string | null;
  items: NotifierItem[];
};

type ShopPrefs = {
  currency: string;
  shopName: string;
  dailyOrderReset: boolean;
  receiptLogo: string | null;
  receiptHeader: string;
  receiptFooter: string;
  receiptSize: string;
};

const POLL_MS = 12_000;

/** Same local-day check the Sales page uses (device timezone). */
function sameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

/**
 * Owner-only floating QR-order inbox (bottom end corner).
 * Polls /api/orders for guest table orders (takenBy = "QR Order"), shows a
 * badge with the pending count, and lets the owner Complete (marks every item
 * ready → order is stamped completedAt, i.e. lands as done in Sales and on the
 * guest tracking page) and Print a branded receipt straight from the alert.
 */
export function OrderNotifier() {
  const { t, lang } = useI18n();
  const N = t.notifier;
  const P = t.pos;

  const [prefs, setPrefs] = useState<ShopPrefs | null>(null);
  const [orders, setOrders] = useState<NotifierOrder[]>([]);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [printOrder, setPrintOrder] = useState<NotifierOrder | null>(null);
  const [bumped, setBumped] = useState(false);
  const prevPendingRef = useRef(0);

  const loadPrefs = useCallback(async () => {
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const u = data.user ?? {};
      setPrefs({
        currency: u.currency ?? "Rs",
        shopName: u.shopName ?? "",
        dailyOrderReset: u.dailyOrderReset === true,
        receiptLogo: u.receiptLogo ?? null,
        receiptHeader: u.receiptHeader ?? "",
        receiptFooter: u.receiptFooter ?? "",
        receiptSize: u.receiptSize ?? "80",
      });
    } catch {
      /* offline — keep previous prefs */
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders?limit=150", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const rows: NotifierOrder[] = Array.isArray(data.orders) ? data.orders : [];
      setOrders(rows.filter((o) => o.takenBy === "QR Order" && !o.voidedAt));
    } catch {
      /* offline — keep previous list */
    }
  }, []);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  useEffect(() => {
    loadOrders();
    const timer = setInterval(loadOrders, POLL_MS);
    const onFocus = () => loadOrders();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadOrders]);

  const now = new Date();
  const pending = orders.filter((o) => !o.completedAt);
  const completedToday = orders.filter(
    (o) => o.completedAt && sameLocalDay(new Date(o.completedAt), now),
  );

  // Pop animation + opens the panel automatically when a brand-new order lands.
  useEffect(() => {
    if (pending.length > prevPendingRef.current) {
      setBumped(true);
      const t1 = setTimeout(() => setBumped(false), 1200);
      prevPendingRef.current = pending.length;
      return () => clearTimeout(t1);
    }
    prevPendingRef.current = pending.length;
  }, [pending.length]);

  async function completeOrder(order: NotifierOrder) {
    const itemIds = order.items.filter((i) => i.status !== "ready").map((i) => i.id);
    if (itemIds.length === 0) return;
    setBusyId(order.id);
    try {
      const res = await fetch("/api/kitchen", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds, status: "ready" }),
      });
      if (res.ok) await loadOrders();
    } finally {
      setBusyId(null);
    }
  }

  const money = useCallback(
    (n: number) => `${prefs?.currency ?? "Rs"} ${formatNumber(n, lang)}`,
    [prefs, lang],
  );

  const displayNo = (o: NotifierOrder) => (prefs?.dailyOrderReset ? o.dailyOrderNo : o.orderNumber);

  if (!prefs) return null;

  return (
    <>
      {/* Floating bell button */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        animate={bumped ? { scale: [1, 1.18, 1] } : {}}
        transition={{ duration: 0.5 }}
        className="fixed bottom-20 end-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-xl shadow-orange-500/40 ring-4 ring-white/60 transition hover:scale-105 lg:bottom-6 lg:end-6"
        aria-label={N.title}
      >
        <BellRing className={cn("h-6 w-6", bumped && "animate-bounce")} />
        {pending.length > 0 && (
          <span className="absolute -top-1.5 -end-1.5 grid h-7 min-w-7 place-items-center rounded-full bg-slate-900 px-1.5 text-sm font-black text-white ring-2 ring-white">
            {pending.length > 9 ? "9+" : formatNumber(pending.length, lang)}
          </span>
        )}
      </motion.button>

      {/* Stacked alert cards */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed bottom-[9.5rem] end-4 z-40 flex max-h-[70vh] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 lg:bottom-24 lg:end-6"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 text-white">
                  <QrCode className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-black text-slate-900">{N.title}</p>
                  <p className="text-[11px] text-slate-500">{N.subtitle}</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                aria-label={t.close}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="scroll-thin flex-1 space-y-3 overflow-y-auto p-3">
              {pending.length === 0 && completedToday.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-500">{N.empty}</p>
              )}

              {pending.length > 0 && (
                <p className="px-1 text-[11px] font-black uppercase tracking-wider text-orange-600">
                  {N.pending} · {formatNumber(pending.length, lang)}
                </p>
              )}
              {pending.map((order, i) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.05, 0.3) }}
                  className="rounded-2xl border-2 border-orange-200 bg-orange-50/60 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900">
                        #{formatNumber(displayNo(order), lang)}
                        <span className="ms-2 font-bold text-slate-600">
                          {order.customerName || N.guest}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {formatTime(order.createdAt, lang)} · {formatNumber(order.items.reduce((s, l) => s + l.quantity, 0), lang)}{" "}
                        {t.sales.items.toLowerCase()}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-black text-slate-900">{money(order.total)}</p>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-slate-600">
                    {order.items.map((l) => `${formatNumber(l.quantity, lang)}× ${l.name}`).join(" · ")}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      className="flex-1 !py-1.5 text-xs"
                      onClick={() => completeOrder(order)}
                      disabled={busyId === order.id}
                    >
                      <Check className="h-4 w-4" />
                      {busyId === order.id ? N.completing : N.complete}
                    </Button>
                    <Button
                      variant="secondary"
                      className="!py-1.5 text-xs"
                      onClick={() => setPrintOrder(order)}
                    >
                      <Printer className="h-4 w-4" />
                      {N.print}
                    </Button>
                  </div>
                </motion.div>
              ))}

              {completedToday.length > 0 && (
                <p className="px-1 pt-1 text-[11px] font-black uppercase tracking-wider text-emerald-600">
                  {N.completedToday} · {formatNumber(completedToday.length, lang)}
                </p>
              )}
              {completedToday.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl bg-emerald-50/70 p-3 ring-1 ring-emerald-100"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900">
                        #{formatNumber(displayNo(order), lang)}
                        <span className="ms-2 font-bold text-slate-600">
                          {order.customerName || N.guest}
                        </span>
                      </p>
                      <p className="text-[11px] font-bold text-emerald-600">
                        {N.completed}
                        {order.completedAt && ` · ${formatTime(order.completedAt, lang)}`}
                      </p>
                    </div>
                    <Badge tone="green">{money(order.total)}</Badge>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <Button
                      variant="secondary"
                      className="!py-1 text-xs"
                      onClick={() => setPrintOrder(order)}
                    >
                      <Printer className="h-3.5 w-3.5" />
                      {N.print}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Receipt preview modal */}
      <Modal
        open={Boolean(printOrder)}
        onClose={() => setPrintOrder(null)}
        title={N.print}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> {P.print}
            </Button>
            <Button className="flex-1" onClick={() => setPrintOrder(null)}>
              {t.close}
            </Button>
          </div>
        }
      >
        {printOrder && (
          <div
            id="receipt-print"
            className="mx-auto max-w-xs rounded-2xl bg-white p-5 font-mono text-[13px] text-slate-800 shadow-inner ring-1 ring-slate-200"
          >
            <div className="text-center">
              {prefs.receiptLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={prefs.receiptLogo} alt="" className="mx-auto mb-2 h-14 w-14 rounded-xl object-contain" />
              ) : null}
              <p className="text-base font-black uppercase tracking-wide">{prefs.shopName}</p>
              {prefs.receiptHeader ? (
                <p className="text-[11px] font-semibold text-slate-600">{prefs.receiptHeader}</p>
              ) : null}
              <p className="text-[11px] text-slate-500">
                {formatDate(printOrder.createdAt, lang)} · {formatTime(printOrder.createdAt, lang)}
              </p>
              <p className="mt-1 text-xs font-bold">
                {P.orderNo}
                {formatNumber(displayNo(printOrder), lang)}
              </p>
              {printOrder.customerName && <p className="text-xs">{printOrder.customerName}</p>}
            </div>
            <div className="my-3 border-t border-dashed border-slate-300" />
            <div className="space-y-1.5">
              {printOrder.items.map((line) => (
                <div key={line.id} className="flex justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate">
                    {formatNumber(line.quantity, lang)} × {line.name}
                  </span>
                  <span className="shrink-0">{formatNumber(line.lineTotal, lang)}</span>
                </div>
              ))}
            </div>
            <div className="my-3 border-t border-dashed border-slate-300" />
            <div className="flex justify-between text-sm font-black">
              <span>{P.totalLabel}</span>
              <span>{money(printOrder.total)}</span>
            </div>
            <div className="mt-1 flex justify-between text-xs">
              <span>{P.received}</span>
              <span>{money(printOrder.amountReceived)}</span>
            </div>
            <div className="mt-1 flex justify-between text-xs font-bold text-emerald-700">
              <span>{P.changeLabel}</span>
              <span>{money(printOrder.changeDue)}</span>
            </div>
            <div className="my-3 border-t border-dashed border-slate-300" />
            {prefs.receiptFooter ? (
              <p className="mb-1 text-center text-[11px] font-semibold text-slate-600">{prefs.receiptFooter}</p>
            ) : null}
            <p className="text-center text-[11px] text-slate-500">{P.thankYou}</p>
          </div>
        )}
      </Modal>

      {/* Hidden print sheet (only content printed by window.print) */}
      {printOrder && (
        <div id="notifier-print-sheet" aria-hidden="true">
          <div className="print-slip" style={prefs.receiptSize === "58" ? { width: "58mm" } : undefined}>
            {prefs.receiptLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={prefs.receiptLogo} alt="" className="ps-logo" />
            ) : null}
            <p className="ps-shop">{prefs.shopName}</p>
            {prefs.receiptHeader ? <p className="ps-meta">{prefs.receiptHeader}</p> : null}
            <p className="ps-label">{P.customerCopy}</p>
            <p className="ps-meta">
              {P.orderNo}
              {formatNumber(displayNo(printOrder), lang)} · {formatDate(printOrder.createdAt, lang)} ·{" "}
              {formatTime(printOrder.createdAt, lang)}
            </p>
            {printOrder.customerName && <p className="ps-meta">{printOrder.customerName}</p>}
            <div className="ps-div" />
            {printOrder.items.map((line) => (
              <p key={line.id} className="ps-split ps-line">
                <span>
                  {formatNumber(line.quantity, lang)} × {line.name}
                </span>
                <span>{formatNumber(line.lineTotal, lang)}</span>
              </p>
            ))}
            <div className="ps-div" />
            <p className="ps-split ps-total">
              <span>{P.totalLabel}</span>
              <span>{money(printOrder.total)}</span>
            </p>
            <p className="ps-split">
              <span>{P.received}</span>
              <span>{money(printOrder.amountReceived)}</span>
            </p>
            <p className="ps-split ps-change">
              <span>{P.changeLabel}</span>
              <span>{money(printOrder.changeDue)}</span>
            </p>
            {prefs.receiptFooter ? <p className="ps-meta">{prefs.receiptFooter}</p> : null}
            <p className="ps-meta">{P.thankYou}</p>
          </div>
        </div>
      )}
    </>
  );
}
