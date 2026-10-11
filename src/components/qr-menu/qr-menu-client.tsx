"use client";

import { useMemo, useState } from "react";
import { compressImage } from "@/lib/format";

/* Guest menu is standalone (no app i18n): static EN + AR strings, toggled in-page.
   Item names always stay as the restaurant typed them. */
const STR = {
  en: {
    unavailable: "This menu is not available right now. Please ask the staff for assistance.",
    received: "Order received!",
    orderNo: "Order #",
    sentKitchen: "Your order has been sent to the kitchen. Please show this number at the counter.",
    paidOnline: "Paid online? Send your screenshot 📸",
    paidHint: "Upload the bank / wallet payment screenshot so the counter can confirm your payment with this order.",
    uploading: "Uploading...",
    uploadBtn: "Upload payment screenshot",
    proofSent: "✅ Payment screenshot received! The counter will confirm your payment.",
    proofFail: "Upload failed. Please try again with a smaller image.",
    trackLive: "🔥 Track your order live",
    orderMore: "Order more",
    tagline: "Scan • Order • Enjoy",
    all: "All",
    noItems: "No items available right now.",
    soldOut: "Sold out",
    items: "items",
    review: "Review order →",
    yourOrder: "Your order",
    each: "each",
    nameLabel: "Your name or table (optional)",
    namePh: "e.g. Ahmed / Table 5",
    notePh: "✎ Note (e.g. less spicy)",
    subtotal: "Subtotal",
    tax: "Tax",
    total: "Total",
    placeOrder: "Place order",
    placing: "Placing order…",
    back: "← Back to menu",
    errStock: "Sorry — one of the items just sold out. Please adjust your order.",
    errGeneric: "Order could not be placed. Please try again.",
    errNetwork: "Network problem. Please check your connection and try again.",
  },
  ar: {
    unavailable: "هذه القائمة غير متاحة حالياً. يرجى طلب المساعدة من الموظفين.",
    received: "تم استلام الطلب!",
    orderNo: "طلب رقم #",
    sentKitchen: "تم إرسال طلبك إلى المطبخ. يرجى إظهار هذا الرقم عند الكاونتر.",
    paidOnline: "دفعت عبر الإنترنت؟ أرسل لقطة الشاشة 📸",
    paidHint: "ارفع لقطة شاشة الدفع البنكي / المحفظة حتى يؤكد الكاونتر دفعك مع هذا الطلب.",
    uploading: "جارٍ الرفع...",
    uploadBtn: "رفع لقطة الدفع",
    proofSent: "✅ تم استلام لقطة الدفع! سيؤكد الكاونتر دفعك.",
    proofFail: "فشل الرفع. حاول مرة أخرى بصورة أصغر.",
    trackLive: "🔥 تتبّع طلبك مباشرة",
    orderMore: "اطلب المزيد",
    tagline: "امسح • اطلب • استمتع",
    all: "الكل",
    noItems: "لا توجد أصناف متاحة حالياً.",
    soldOut: "نفد من المخزون",
    items: "أصناف",
    review: "مراجعة الطلب ←",
    yourOrder: "طلبك",
    each: "للقطعة",
    nameLabel: "اسمك أو رقم الطاولة (اختياري)",
    namePh: "مثال: أحمد / طاولة 5",
    notePh: "✎ ملاحظة (مثال: حار قليل)",
    subtotal: "المجموع الفرعي",
    tax: "الضريبة",
    total: "الإجمالي",
    placeOrder: "إرسال الطلب",
    placing: "جارٍ إرسال الطلب…",
    back: "→ العودة إلى القائمة",
    errStock: "عذراً — أحد الأصناف نفد للتو. عدّل طلبك من فضلك.",
    errGeneric: "تعذّر إرسال الطلب. حاول مرة أخرى.",
    errNetwork: "مشكلة في الشبكة. تحقق من اتصالك وحاول مرة أخرى.",
  },
} as const;

type Lang = keyof typeof STR;

type Item = {
  id: number;
  name: string;
  category: string;
  price: number;
  emoji: string;
  imageData: string | null;
  extras?: { name: string; price: number }[];
  stockQty?: number | null;
};

type CartLine = { item: Item; qty: number; extraIndex?: number; unitPrice: number; displayName: string };

export function QrMenuClient({
  restaurantId,
  shopName,
  currency,
  active,
  items,
  tablePrefill = "",
  guestTracking = false,
  paymentProof = false,
  taxRate = 0,
}: {
  restaurantId: number;
  shopName: string;
  currency: string;
  active: boolean;
  items: Item[];
  tablePrefill?: string;
  guestTracking?: boolean;
  /** Payment proof add-on: guest can attach an online-payment screenshot on the done screen. */
  paymentProof?: boolean;
  /** Tax add-on: VAT % configured by the shop (0 = off). Server re-computes the final amount. */
  taxRate?: number;
}) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [customerName, setCustomerName] = useState(tablePrefill);
  const [cartOpen, setCartOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ id: number; orderNumber: number; total: number } | null>(null);
  const [proofState, setProofState] = useState<"idle" | "uploading" | "sent" | "failed">("idle");
  const [cat, setCat] = useState<string>("all");
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    return window.localStorage.getItem("qrmenu-lang") === "ar" ? "ar" : "en";
  });

  const t = STR[lang];
  const isAr = lang === "ar";

  function switchLang(next: Lang) {
    setLang(next);
    try {
      window.localStorage.setItem("qrmenu-lang", next);
    } catch {
      /* private mode */
    }
  }

  const money = (n: number) => `${currency} ${n.toLocaleString()}`;

  const cats = useMemo(() => [...new Set(items.map((i) => i.category || "General"))], [items]);
  const list = useMemo(
    () => (cat === "all" ? items : items.filter((i) => (i.category || "General") === cat)),
    [items, cat],
  );

  const lines: CartLine[] = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([key, qty]): CartLine | null => {
      const [rawId, rawEx] = key.split("x");
      const item = items.find((i) => i.id === Number(rawId));
      if (!item) return null;
      const extras = item.extras ?? [];
      const ex = rawEx === undefined ? null : (extras[Number(rawEx)] ?? null);
      const unitPrice = item.price + (ex?.price ?? 0);
      return {
        item,
        qty,
        unitPrice,
        extraIndex: ex ? Number(rawEx) : undefined,
        displayName: ex ? `${item.name} + ${ex.name}` : item.name,
      };
    })
    .filter((l): l is CartLine => l !== null);
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const taxRateClient = taxRate >= 1 ? Math.min(30, Math.round(taxRate)) : 0;
  const taxAmount = Math.round((subtotal * taxRateClient) / 100);
  const total = subtotal + taxAmount;
  const count = lines.reduce((s, l) => s + l.qty, 0);

  function bump(key: string, delta: number) {
    setCart((prev) => {
      const next = { ...prev };
      const v = (next[key] ?? 0) + delta;
      if (v <= 0) delete next[key];
      else next[key] = Math.min(v, 20);
      return next;
    });
  }

  async function placeOrder() {
    setPlacing(true);
    setError("");
    try {
      const res = await fetch(`/api/public/order/${restaurantId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          items: lines.map((l) => {
            const key = l.extraIndex === undefined ? String(l.item.id) : `${l.item.id}x${l.extraIndex}`;
            return { menuItemId: l.item.id, quantity: l.qty, extraIndex: l.extraIndex, note: notes[key]?.trim() || undefined };
          }),
        }),
      });
      const data = (await res.json()) as { id?: number; orderNumber?: number; total?: number; error?: string };
      if (res.ok && data.orderNumber) {
        setDone({ id: data.id ?? 0, orderNumber: data.orderNumber, total: data.total ?? total });
        setCart({});
        setNotes({});
        setCartOpen(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (data.error === "STOCK_SHORT") {
        setError(t.errStock);
      } else {
        setError(t.errGeneric);
      }
    } catch {
      setError(t.errNetwork);
    } finally {
      setPlacing(false);
    }
  }

  if (!active) {
    return (
      <main dir={isAr ? "rtl" : "ltr"} lang={lang} className="flex min-h-svh items-center justify-center bg-gradient-to-b from-amber-50 to-orange-50 px-4">
        <div className="w-full max-w-sm rounded-3xl border border-orange-200 bg-white p-8 text-center shadow-lg">
          <div className="text-4xl">🍽️</div>
          <h1 className="mt-3 text-xl font-bold text-slate-900">{shopName}</h1>
          <p className="mt-2 text-sm text-slate-500">{t.unavailable}</p>
        </div>
      </main>
    );
  }

  if (done) {
    return (
      <main dir={isAr ? "rtl" : "ltr"} lang={lang} className="flex min-h-svh items-center justify-center bg-gradient-to-b from-emerald-50 to-teal-50 px-4">
        <div className="w-full max-w-sm rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">✅</div>
          <p className="mt-4 text-sm font-medium text-emerald-700">{t.received}</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
            {t.orderNo}
            {done.orderNumber}
          </h1>
          <p className="mt-2 text-lg font-semibold text-slate-700">{money(done.total)}</p>
          <p className="mt-3 text-sm text-slate-500">{t.sentKitchen}</p>
          {paymentProof && done.id > 0 && (
            <div className="mt-4 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/70 p-4 text-start">
              {proofState === "sent" ? (
                <p className="text-sm font-semibold text-emerald-700">{t.proofSent}</p>
              ) : (
                <>
                  <p className="text-sm font-bold text-slate-800">{t.paidOnline}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{t.paidHint}</p>
                  <label
                    className={`mt-3 block cursor-pointer rounded-xl bg-emerald-600 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 ${
                      proofState === "uploading" ? "pointer-events-none opacity-60" : ""
                    }`}
                  >
                    {proofState === "uploading" ? t.uploading : t.uploadBtn}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setProofState("uploading");
                        compressImage(file, 640, 0.8)
                          .then((image) =>
                            fetch(`/api/public/order/${restaurantId}/proof`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ orderId: done.id, image }),
                            }).then(async (res) => {
                              if (!res.ok) throw new Error();
                              setProofState("sent");
                            }),
                          )
                          .catch(() => setProofState("failed"));
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {proofState === "failed" && (
                    <p className="mt-2 text-xs font-semibold text-rose-600">{t.proofFail}</p>
                  )}
                </>
              )}
            </div>
          )}
          {guestTracking && (
            <a
              href={`/r/${restaurantId}/o/${done.orderNumber}`}
              className="mt-6 block w-full rounded-xl bg-orange-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
            >
              {t.trackLive}
            </a>
          )}
          <button
            onClick={() => setDone(null)}
            className={`w-full rounded-xl py-3 text-sm font-semibold shadow-sm transition ${
              guestTracking
                ? "mt-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                : "mt-6 bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            {t.orderMore}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main dir={isAr ? "rtl" : "ltr"} lang={lang} className="min-h-svh bg-gradient-to-b from-amber-50 to-orange-50 pb-28">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-orange-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-xl shadow-sm">
            🍽️
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold text-slate-900">{shopName}</h1>
            <p className="text-xs text-slate-500">
              {t.tagline}
              {tablePrefill ? ` · ${tablePrefill}` : ""}
            </p>
          </div>
          <button
            onClick={() => switchLang(isAr ? "en" : "ar")}
            className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-orange-700 ring-1 ring-orange-200 transition hover:bg-orange-50"
            aria-label="Switch language"
          >
            {isAr ? "EN" : "عربي"}
          </button>
          {tablePrefill && (
            <span className="shrink-0 rounded-full bg-violet-600 px-3 py-1 text-xs font-bold text-white">
              {tablePrefill}
            </span>
          )}
        </div>
        {cats.length > 1 && (
          <div className="mx-auto flex max-w-2xl gap-2 overflow-x-auto px-4 pb-3">
            <button
              onClick={() => setCat("all")}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                cat === "all" ? "bg-orange-600 text-white shadow-sm" : "bg-white text-slate-600 ring-1 ring-orange-200"
              }`}
            >
              {t.all}
            </button>
            {cats.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  cat === c ? "bg-orange-600 text-white shadow-sm" : "bg-white text-slate-600 ring-1 ring-orange-200"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Items */}
      <div className="mx-auto max-w-2xl px-4 py-4">
        {list.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-500">{t.noItems}</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {list.map((item) => {
              const soldOut = item.stockQty != null && item.stockQty <= 0;
              const key = String(item.id);
              const qty = cart[key] ?? 0;
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-white p-3 shadow-sm"
                >
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-orange-100 text-3xl">
                    {item.imageData ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageData} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <span>{item.emoji || "🍴"}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.category || "General"}</p>
                    <p className="mt-0.5 text-sm font-bold text-orange-700">{money(item.price)}</p>
                    {(item.extras?.length ?? 0) > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {(item.extras ?? []).map((ex, ei) => {
                          const exKey = `${item.id}x${ei}`;
                          const exQty = cart[exKey] ?? 0;
                          return (
                            <button
                              type="button"
                              key={ex.name}
                              disabled={soldOut}
                              onClick={() => bump(exKey, 1)}
                              className="rounded-lg bg-orange-100 px-2 py-1 text-[10px] font-bold text-orange-700 ring-1 ring-orange-200 transition hover:bg-orange-200 disabled:opacity-50"
                            >
                              +{ex.name} {ex.price ? `+${money(ex.price)}` : ""}
                              {exQty > 0 ? ` (${exQty})` : ""}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {soldOut ? (
                    <span className="shrink-0 rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white">
                      {t.soldOut}
                    </span>
                  ) : qty === 0 ? (
                    <button
                      onClick={() => bump(key, 1)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-600 text-lg font-bold text-white shadow-sm transition active:scale-95"
                      aria-label={`Add ${item.name}`}
                    >
                      +
                    </button>
                  ) : (
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => bump(key, -1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-base font-bold text-orange-700 transition active:scale-95"
                      >
                        −
                      </button>
                      <span className="w-5 text-center text-sm font-bold text-slate-900">{qty}</span>
                      <button
                        onClick={() => bump(key, 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-600 text-base font-bold text-white transition active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Floating cart bar */}
      {count > 0 && !cartOpen && (
        <div className="fixed inset-x-0 bottom-0 z-20 px-4 pb-4">
          <button
            onClick={() => setCartOpen(true)}
            className="mx-auto flex w-full max-w-2xl items-center justify-between rounded-2xl bg-slate-900 px-5 py-4 text-white shadow-xl"
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              🛒 {count} {t.items}
            </span>
            <span className="text-sm font-semibold">
              {money(total)} · <span className="text-orange-300">{t.review}</span>
            </span>
          </button>
        </div>
      )}

      {/* Cart sheet */}
      {cartOpen && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40" onClick={() => setCartOpen(false)}>
          <div
            className="max-h-[85svh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
            <h2 className="text-lg font-bold text-slate-900">{t.yourOrder}</h2>
            <ul className="mt-3 space-y-2">
              {lines.map((l) => {
                const lineKey = l.extraIndex === undefined ? String(l.item.id) : `${l.item.id}x${l.extraIndex}`;
                return (
                  <li key={lineKey} className="rounded-xl bg-orange-50 px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{l.item.emoji || "🍴"}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{l.displayName}</p>
                        <p className="text-xs text-slate-500">
                          {money(l.unitPrice)} {t.each}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => bump(lineKey, -1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-bold text-orange-700 ring-1 ring-orange-200"
                        >
                          −
                        </button>
                        <span className="w-5 text-center text-sm font-bold">{l.qty}</span>
                        <button
                          onClick={() => bump(lineKey, 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-600 text-sm font-bold text-white"
                        >
                          +
                        </button>
                      </div>
                      <p className="w-20 text-end text-sm font-bold text-slate-900">{money(l.unitPrice * l.qty)}</p>
                    </div>
                    <input
                      value={notes[lineKey] ?? ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [lineKey]: e.target.value }))}
                      maxLength={140}
                      placeholder={t.notePh}
                      className="mt-1.5 w-full rounded-lg border-0 bg-white px-2 py-1.5 text-[11px] text-slate-600 shadow-sm outline-none ring-1 ring-transparent placeholder:text-slate-400 focus:ring-orange-300"
                    />
                  </li>
                );
              })}
            </ul>

            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t.nameLabel}
            </label>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={t.namePh}
              maxLength={100}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
            />

            <div className="mt-4 space-y-1 border-t border-slate-100 pt-4">
              {taxAmount > 0 && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">{t.subtotal}</span>
                    <span className="font-semibold text-slate-700">{money(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">
                      {t.tax} ({taxRateClient}%)
                    </span>
                    <span className="font-semibold text-slate-700">+{money(taxAmount)}</span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-600">{t.total}</span>
                <span className="text-xl font-extrabold text-slate-900">{money(total)}</span>
              </div>
            </div>
            {error && <p className="mt-2 text-center text-xs font-medium text-red-600">{error}</p>}
            <button
              onClick={placeOrder}
              disabled={placing || count === 0}
              className="mt-3 w-full rounded-xl bg-orange-600 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-50"
            >
              {placing ? t.placing : t.placeOrder}
            </button>
            <button onClick={() => setCartOpen(false)} className="mt-2 w-full py-2 text-center text-xs font-semibold text-slate-500">
              {t.back}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
