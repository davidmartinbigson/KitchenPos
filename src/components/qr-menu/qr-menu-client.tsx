"use client";

import { useMemo, useState } from "react";

type Item = {
  id: number;
  name: string;
  category: string;
  price: number;
  emoji: string;
  imageData: string | null;
};

type CartLine = { item: Item; qty: number };

export function QrMenuClient({
  restaurantId,
  shopName,
  currency,
  active,
  items,
}: {
  restaurantId: number;
  shopName: string;
  currency: string;
  active: boolean;
  items: Item[];
}) {
  const [cart, setCart] = useState<Record<number, number>>({});
  const [customerName, setCustomerName] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ orderNumber: number; total: number } | null>(null);
  const [cat, setCat] = useState<string>("all");

  const money = (n: number) => `${currency} ${n.toLocaleString()}`;

  const cats = useMemo(() => [...new Set(items.map((i) => i.category || "General"))], [items]);
  const list = useMemo(
    () => (cat === "all" ? items : items.filter((i) => (i.category || "General") === cat)),
    [items, cat],
  );

  const lines: CartLine[] = Object.entries(cart)
    .map(([id, qty]) => ({ item: items.find((i) => i.id === Number(id)) as Item, qty }))
    .filter((l) => l.item);
  const total = lines.reduce((s, l) => s + l.item.price * l.qty, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);

  function bump(id: number, delta: number) {
    setCart((prev) => {
      const next = { ...prev };
      const v = (next[id] ?? 0) + delta;
      if (v <= 0) delete next[id];
      else next[id] = Math.min(v, 20);
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
          items: lines.map((l) => ({ menuItemId: l.item.id, quantity: l.qty })),
        }),
      });
      const data = (await res.json()) as { orderNumber?: number; total?: number; error?: string };
      if (res.ok && data.orderNumber) {
        setDone({ orderNumber: data.orderNumber, total: data.total ?? total });
        setCart({});
        setCartOpen(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setError("Order could not be placed. Please try again.");
      }
    } catch {
      setError("Network problem. Please check your connection and try again.");
    } finally {
      setPlacing(false);
    }
  }

  if (!active) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-gradient-to-b from-amber-50 to-orange-50 px-4">
        <div className="w-full max-w-sm rounded-3xl border border-orange-200 bg-white p-8 text-center shadow-lg">
          <div className="text-4xl">🍽️</div>
          <h1 className="mt-3 text-xl font-bold text-slate-900">{shopName}</h1>
          <p className="mt-2 text-sm text-slate-500">
            This menu is not available right now. Please ask the staff for assistance.
          </p>
        </div>
      </main>
    );
  }

  if (done) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-gradient-to-b from-emerald-50 to-teal-50 px-4">
        <div className="w-full max-w-sm rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">✅</div>
          <p className="mt-4 text-sm font-medium text-emerald-700">Order received!</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
            Order #{done.orderNumber}
          </h1>
          <p className="mt-2 text-lg font-semibold text-slate-700">{money(done.total)}</p>
          <p className="mt-3 text-sm text-slate-500">
            Your order has been sent to the kitchen. Please show this number at the counter.
          </p>
          <button
            onClick={() => setDone(null)}
            className="mt-6 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            Order more
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-svh bg-gradient-to-b from-amber-50 to-orange-50 pb-28">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-orange-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-xl shadow-sm">
            🍽️
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-slate-900">{shopName}</h1>
            <p className="text-xs text-slate-500">Scan • Order • Enjoy</p>
          </div>
        </div>
        {cats.length > 1 && (
          <div className="mx-auto flex max-w-2xl gap-2 overflow-x-auto px-4 pb-3">
            <button
              onClick={() => setCat("all")}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                cat === "all" ? "bg-orange-600 text-white shadow-sm" : "bg-white text-slate-600 ring-1 ring-orange-200"
              }`}
            >
              All
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
          <p className="py-16 text-center text-sm text-slate-500">No items available right now.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {list.map((item) => {
              const qty = cart[item.id] ?? 0;
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
                  </div>
                  {qty === 0 ? (
                    <button
                      onClick={() => bump(item.id, 1)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-600 text-lg font-bold text-white shadow-sm transition active:scale-95"
                      aria-label={`Add ${item.name}`}
                    >
                      +
                    </button>
                  ) : (
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => bump(item.id, -1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-base font-bold text-orange-700 transition active:scale-95"
                      >
                        −
                      </button>
                      <span className="w-5 text-center text-sm font-bold text-slate-900">{qty}</span>
                      <button
                        onClick={() => bump(item.id, 1)}
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
              🛒 {count} item{count !== 1 ? "s" : ""}
            </span>
            <span className="text-sm font-semibold">
              {money(total)} · <span className="text-orange-300">Review order →</span>
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
            <h2 className="text-lg font-bold text-slate-900">Your order</h2>
            <ul className="mt-3 space-y-2">
              {lines.map((l) => (
                <li key={l.item.id} className="flex items-center gap-3 rounded-xl bg-orange-50 px-3 py-2.5">
                  <span className="text-xl">{l.item.emoji || "🍴"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{l.item.name}</p>
                    <p className="text-xs text-slate-500">{money(l.item.price)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => bump(l.item.id, -1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-bold text-orange-700 ring-1 ring-orange-200"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-sm font-bold">{l.qty}</span>
                    <button
                      onClick={() => bump(l.item.id, 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-600 text-sm font-bold text-white"
                    >
                      +
                    </button>
                  </div>
                  <p className="w-20 text-right text-sm font-bold text-slate-900">{money(l.item.price * l.qty)}</p>
                </li>
              ))}
            </ul>

            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Your name (optional)
            </label>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Table 5 / Ahmed"
              maxLength={100}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
            />

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-sm font-semibold text-slate-600">Total</span>
              <span className="text-xl font-extrabold text-slate-900">{money(total)}</span>
            </div>
            {error && <p className="mt-2 text-center text-xs font-medium text-red-600">{error}</p>}
            <button
              onClick={placeOrder}
              disabled={placing || count === 0}
              className="mt-3 w-full rounded-xl bg-orange-600 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-50"
            >
              {placing ? "Placing order…" : "Place order"}
            </button>
            <button onClick={() => setCartOpen(false)} className="mt-2 w-full py-2 text-center text-xs font-semibold text-slate-500">
              ← Back to menu
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
