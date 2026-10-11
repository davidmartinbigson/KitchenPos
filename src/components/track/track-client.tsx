"use client";

import { useCallback, useEffect, useState } from "react";

type Status = {
  poll: number;
  shopName: string;
  currency: string;
  order: {
    orderNumber: number;
    customerName: string;
    total: number;
    createdAt: string;
    completedAt: string | null;
    rating: number | null;
    stage: "new" | "preparing" | "almost" | "ready" | "done";
    items: { id: number; name: string; quantity: number; status: string }[];
  };
};

const STAGES = [
  { key: "new", label: "Received", emoji: "🧾", desc: "We got your order" },
  { key: "preparing", label: "Preparing", emoji: "🔥", desc: "On the stove now" },
  { key: "almost", label: "Almost ready", emoji: "🍽️", desc: "Plating it up" },
  { key: "ready", label: "Ready", emoji: "✅", desc: "Collect at the counter" },
] as const;

function stageIndex(s: Status["order"]["stage"]): number {
  if (s === "done") return 4;
  return STAGES.findIndex((x) => x.key === s);
}

export function TrackClient({
  restaurantId,
  orderNumber,
  feedbackEnabled = false,
  googleReviewUrl = "",
}: {
  restaurantId: number;
  orderNumber: number;
  /** Feedback add-on: guest can rate 1–5 with a short comment once the order is done. */
  feedbackEnabled?: boolean;
  /** Google review add-on: external "Rate us on Google" link (https only, validated in Settings). */
  googleReviewUrl?: string;
}) {
  const [data, setData] = useState<Status | null>(null);
  const [error, setError] = useState<"missing" | "off" | null>(null);
  const [loading, setLoading] = useState(true);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [ratingState, setRatingState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  async function submitRating() {
    if (stars < 1) return;
    setRatingState("sending");
    try {
      const res = await fetch(`/api/public/order/${restaurantId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, rating: stars, comment: comment.trim() || undefined }),
      });
      if (res.status === 201 || res.status === 409) setRatingState("sent");
      else setRatingState("failed");
    } catch {
      setRatingState("failed");
    }
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/order/${restaurantId}/status?n=${orderNumber}`, { cache: "no-store" });
      if (res.status === 403) {
        setError("off");
        setLoading(false);
        return;
      }
      if (res.status === 404) {
        setError("missing");
        setLoading(false);
        return;
      }
      if (res.ok) {
        setData((await res.json()) as Status);
        setError(null);
        setLoading(false);
      }
    } catch {
      /* network hiccup — next poll retries */
    }
  }, [restaurantId, orderNumber]);

  useEffect(() => {
    load();
    const t = setInterval(load, 12_000);
    return () => clearInterval(t);
  }, [load]);

  const done = data?.order.stage === "ready" || data?.order.stage === "done";

  return (
    <main className="min-h-svh bg-gradient-to-b from-amber-50 via-orange-50 to-rose-50 pb-12">
      <div className="mx-auto max-w-md px-4 pt-8">
        <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-xl shadow-orange-900/10 sm:p-8">
          {loading && !data && !error ? (
            <div className="py-16 text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600" />
              <p className="mt-4 text-sm text-slate-500">Checking your order…</p>
            </div>
          ) : error === "off" ? (
            <div className="py-10 text-center">
              <div className="text-4xl">🍽️</div>
              <h1 className="mt-3 text-xl font-extrabold text-slate-900">Live tracking isn&#8217;t on here</h1>
              <p className="mt-2 text-sm text-slate-500">
                This restaurant hasn&#8217;t switched on live order tracking yet — please ask at the counter.
              </p>
            </div>
          ) : error === "missing" || !data ? (
            <div className="py-10 text-center">
              <div className="text-4xl">🤔</div>
              <h1 className="mt-3 text-xl font-extrabold text-slate-900">Order not found</h1>
              <p className="mt-2 text-sm text-slate-500">Check the order number on this link, or ask the staff.</p>
            </div>
          ) : (
            <>
              <div className="text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-orange-500">{data.shopName}</p>
                <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">
                  Order #{data.order.orderNumber}
                </h1>
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-extrabold text-emerald-700 ring-1 ring-emerald-200">
                  <span className="relative flex h-2 w-2">
                    <span
                      className={`absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 ${done ? "" : "animate-ping"}`}
                    />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  {done ? "Up to date" : "Live — updating automatically"}
                </span>
              </div>

              {/* Vertical status timeline */}
              <ol className="mt-8 space-y-0">
                {STAGES.map((s, i) => {
                  const current = stageIndex(data.order.stage);
                  const state = data.order.stage === "done" ? "done" : i < current ? "done" : i === current ? "now" : "todo";
                  return (
                    <li key={s.key} className="relative flex gap-4 pb-7 last:pb-0">
                      {i < STAGES.length - 1 && (
                        <span
                          className={`absolute left-[22px] top-11 h-[calc(100%-28px)] w-0.5 rounded ${
                            state === "done" || data.order.stage === "done" ? "bg-emerald-400" : "bg-slate-200"
                          }`}
                        />
                      )}
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg shadow-sm ring-2 transition ${
                          state === "done"
                            ? "bg-emerald-500 text-white ring-emerald-200"
                            : state === "now"
                              ? "bg-orange-500 text-white ring-orange-200"
                              : "bg-slate-100 ring-slate-200"
                        }`}
                      >
                        {state === "done" ? "✓" : s.emoji}
                      </div>
                      <div className="pt-1.5">
                        <p
                          className={`text-sm font-extrabold ${
                            state === "now" ? "text-orange-600" : state === "done" ? "text-emerald-700" : "text-slate-400"
                          }`}
                        >
                          {s.label}
                        </p>
                        <p className={`text-xs ${state === "todo" ? "text-slate-300" : "text-slate-500"}`}>{s.desc}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>

              {data.order.stage === "done" && (
                <div className="mt-6 rounded-2xl bg-emerald-50 p-4 text-center ring-1 ring-emerald-200">
                  <p className="text-sm font-extrabold text-emerald-800">All done — enjoy your meal! 🎉</p>
                </div>
              )}

              {data.order.stage === "done" && feedbackEnabled && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-center ring-1 ring-amber-100">
                  {ratingState === "sent" || data.order.rating ? (
                    <p className="text-sm font-extrabold text-amber-700">
                      Thanks for the love! ⭐ {data.order.rating ? `You rated ${"★".repeat(data.order.rating)}` : "Rating received"}
                    </p>
                  ) : (
                    <>
                      <p className="text-sm font-extrabold text-slate-800">How was your meal?</p>
                      <div className="mt-2 flex justify-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            aria-label={`${n} stars`}
                            onClick={() => setStars(n)}
                            className={`text-3xl transition active:scale-90 ${n <= stars ? "grayscale-0" : "opacity-30 grayscale"}`}
                          >
                            ⭐
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        maxLength={280}
                        rows={2}
                        placeholder="Any feedback for the chef? (optional)"
                        className="mt-3 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-amber-400"
                      />
                      <button
                        onClick={submitRating}
                        disabled={stars < 1 || ratingState === "sending"}
                        className="mt-2.5 w-full rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-50"
                      >
                        {ratingState === "sending" ? "Sending…" : "Send rating"}
                      </button>
                      {ratingState === "failed" && (
                        <p className="mt-2 text-xs font-semibold text-rose-600">Could not send — try again in a moment.</p>
                      )}
                    </>
                  )}
                </div>
              )}

              {(data.order.stage === "done" || data.order.stage === "ready") && googleReviewUrl && (
                <a
                  href={googleReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-white p-3.5 text-sm font-bold text-slate-800 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  Rate us on Google
                </a>
              )}
              {data.order.stage === "ready" && (
                <div className="mt-6 animate-pulse rounded-2xl bg-orange-600 p-4 text-center shadow-lg shadow-orange-600/30">
                  <p className="text-base font-black text-white">Your order is READY — collect at the counter 🎉</p>
                </div>
              )}

              {/* Items */}
              <div className="mt-8 border-t border-dashed border-slate-200 pt-5">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Your items</p>
                <ul className="space-y-2">
                  {data.order.items.map((it) => (
                    <li key={it.id} className="flex items-center gap-3">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          it.status === "ready" || it.status === "served"
                            ? "bg-emerald-500"
                            : it.status === "preparing"
                              ? "bg-orange-500"
                              : "bg-slate-300"
                        }`}
                      />
                      <span className="flex-1 truncate text-sm text-slate-700">
                        {it.quantity} × {it.name}
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        {it.status === "new"
                          ? "Queued"
                          : it.status === "preparing"
                            ? "Cooking"
                            : it.status === "ready"
                              ? "Ready"
                              : "Done"}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-right text-sm font-extrabold text-slate-900">
                  {data.currency} {data.order.total.toLocaleString()}
                </p>
              </div>
            </>
          )}
        </div>
        <p className="mt-5 text-center text-[11px] text-slate-400">
          Powered by Kitchen POS · © 2026 Developed By Shayan Ali
        </p>
      </div>
    </main>
  );
}
