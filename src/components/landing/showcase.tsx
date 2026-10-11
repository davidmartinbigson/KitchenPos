"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, animate, motion } from "framer-motion";
import {
  BarChart3,
  BellRing,
  CookingPot,
  Flame,
  LayoutDashboard,
  MonitorSmartphone,
  QrCode,
  Receipt,
  ShoppingBasket,
  TrendingUp,
} from "lucide-react";
import { useI18n } from "@/components/providers/language-provider";
import { cn } from "@/components/ui";
import { currencyForCountry, detectCountryFromLocale } from "@/lib/countries";
import type { Dict } from "@/lib/i18n";

type ShowcaseDict = Dict["landing"];

/* Visitor's local currency (Rs, AED, $, £ ...). */
function useVisitorCurrency() {
  const [symbol, setSymbol] = useState("Rs");
  useEffect(() => {
    setSymbol(currencyForCountry(detectCountryFromLocale()));
  }, []);
  return symbol;
}

function CountUp({ to, duration = 1.6 }: { to: number; duration?: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const controls = animate(0, to, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [to, duration]);
  return <>{value.toLocaleString("en-US")}</>;
}

/* ───────────────────────── Slide 1 · POS billing ───────────────────────── */

const POS_ITEMS = [
  { emoji: "🍔", name: "Zinger Burger", price: 450 },
  { emoji: "🍕", name: "Pizza Slice", price: 320 },
  { emoji: "🍟", name: "Loaded Fries", price: 280 },
  { emoji: "🍗", name: "Chicken Karahi", price: 950 },
  { emoji: "🥤", name: "Mint Margarita", price: 150 },
  { emoji: "☕", name: "Karak Chai", price: 80 },
];

function PosSlide({ L }: { L: ShowcaseDict }) {
  const cur = useVisitorCurrency();
  const [step, setStep] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setStep((s) => (s + 1) % (POS_ITEMS.length + 2)), 1050);
    return () => clearInterval(iv);
  }, []);
  const cart = POS_ITEMS.slice(0, Math.min(step, POS_ITEMS.length));
  const justTapped = step > 0 && step <= POS_ITEMS.length ? step - 1 : -1;
  const total = cart.reduce((s, i) => s + i.price, 0);

  return (
    <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
      {/* Menu grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {POS_ITEMS.map((item, i) => (
          <motion.div
            key={item.name}
            animate={
              i === justTapped
                ? { scale: [1, 0.94, 1], transition: { duration: 0.4 } }
                : { scale: 1 }
            }
            className={cn(
              "relative rounded-2xl bg-white p-3 ring-1 transition-shadow",
              cart.includes(item) ? "shadow-lg shadow-orange-500/10 ring-orange-300" : "ring-slate-200",
            )}
          >
            {cart.includes(item) && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-orange-500 to-rose-500 text-[10px] font-black text-white shadow"
              >
                ✓
              </motion.span>
            )}
            <span className="text-2xl">{item.emoji}</span>
            <p className="mt-1 truncate text-xs font-bold text-slate-800">{item.name}</p>
            <p className="text-[11px] font-semibold text-slate-500">
              {cur} {item.price}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Live cart */}
      <div className="flex flex-col rounded-2xl bg-slate-950 p-4 text-white">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          <ShoppingBasket className="h-4 w-4 text-orange-400" /> {L.showcaseCart} #1042
        </p>
        <div className="mt-3 flex-1 space-y-1.5">
          <AnimatePresence initial={false}>
            {cart.map((item) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -18, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
                className="flex items-center justify-between overflow-hidden rounded-xl bg-white/10 px-3 py-2 text-xs"
              >
                <span className="flex items-center gap-2 font-semibold">
                  <span>{item.emoji}</span> {item.name}
                </span>
                <span className="font-bold text-orange-200">
                  {cur} {item.price}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
          {cart.length === 0 && (
            <p className="pt-6 text-center text-xs text-slate-500">—</p>
          )}
        </div>
        <div className="mt-3 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-orange-100">{L.showcaseTotal}</p>
          <p className="text-xl font-black">
            {cur} <CountUp to={total} duration={0.5} />
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Slide 2 · QR menu ordering ─────────────────────── */

const QR_MENU = [
  { emoji: "🍔", name: "Zinger Burger", price: 450 },
  { emoji: "🍗", name: "Chicken Karahi", price: 950 },
  { emoji: "🍟", name: "Loaded Fries", price: 280 },
  { emoji: "☕", name: "Karak Chai", price: 80 },
];

function QrSlide({ L }: { L: ShowcaseDict }) {
  const cur = useVisitorCurrency();
  const [phase, setPhase] = useState(0); // 0..3: picking items, 4: order fires
  useEffect(() => {
    const iv = setInterval(() => setPhase((p) => (p + 1) % 6), 1000);
    return () => clearInterval(iv);
  }, []);
  const picked = QR_MENU.slice(0, Math.min(phase, 3));
  const fired = phase >= 4;
  const orderTotal = QR_MENU.slice(0, 3).reduce((s, i) => s + i.price, 0);

  return (
    <div className="grid items-center gap-5 sm:grid-cols-2">
      {/* Guest phone */}
      <div className="mx-auto w-full max-w-[240px] rounded-[2rem] border-4 border-slate-900 bg-white p-3 shadow-2xl">
        <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 p-3 text-white">
          <p className="flex items-center justify-between text-xs font-black">
            Azure Coffee <QrCode className="h-4 w-4" />
          </p>
          <p className="mt-0.5 text-[10px] text-orange-100">Scan • Order • Enjoy · {L.showcaseTable} 5</p>
        </div>
        <div className="mt-2.5 space-y-1.5">
          {QR_MENU.map((item, i) => (
            <div
              key={item.name}
              className={cn(
                "flex items-center gap-2 rounded-xl p-2 ring-1 transition-colors",
                picked.includes(item) ? "bg-orange-50 ring-orange-200" : "bg-slate-50 ring-slate-100",
              )}
            >
              <span className="text-lg">{item.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-bold text-slate-800">{item.name}</p>
                <p className="text-[10px] text-slate-500">
                  {cur} {item.price}
                </p>
              </div>
              <motion.span
                animate={
                  picked.includes(item)
                    ? { scale: [1, 1.25, 1], backgroundColor: "#f97316", color: "#ffffff" }
                    : { scale: 1 }
                }
                className="grid h-5 w-5 place-items-center rounded-full bg-slate-200 text-[10px] font-black text-slate-600"
              >
                {picked.includes(item) ? "✓" : "+"}
              </motion.span>
            </div>
          ))}
        </div>
        <motion.div
          animate={picked.length > 0 ? { y: 0, opacity: 1 } : { y: 8, opacity: 0.4 }}
          className="mt-2.5 rounded-xl bg-slate-900 p-2 text-center text-[11px] font-black text-white"
        >
          {picked.length > 0 ? `🛒 ${picked.length} · ${cur} ${picked.reduce((s, i) => s + i.price, 0)}` : "…"}
        </motion.div>
      </div>

      {/* Owner side: live order alert */}
      <div className="relative flex h-full min-h-[220px] items-center justify-center">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 opacity-[0.04]" />
        <AnimatePresence mode="wait">
          {fired && (
            <motion.div
              key="alert"
              initial={{ opacity: 0, y: 26, scale: 0.9, rotate: -2 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, y: -18, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="relative w-full max-w-[260px] rounded-2xl border-2 border-orange-200 bg-white p-4 shadow-2xl shadow-orange-500/20"
            >
              <div className="flex items-center gap-2.5">
                <motion.span
                  animate={{ rotate: [0, -15, 12, -8, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 1.2 }}
                  className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 text-white"
                >
                  <BellRing className="h-4 w-4" />
                </motion.span>
                <div>
                  <p className="text-xs font-black text-slate-900">{L.showcaseNewOrder} #43</p>
                  <p className="text-[10px] font-semibold text-slate-500">
                    {L.showcaseTable} 5 · {cur} {orderTotal.toLocaleString("en-US")}
                  </p>
                </div>
                <span className="ms-auto grid h-5 min-w-5 place-items-center rounded-full bg-slate-900 px-1 text-[10px] font-black text-white">
                  1
                </span>
              </div>
              <div className="mt-3 space-y-1 border-t border-dashed border-slate-200 pt-2 text-[10px] font-semibold text-slate-600">
                {QR_MENU.slice(0, 3).map((i) => (
                  <p key={i.name}>
                    1× {i.name}
                  </p>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <span className="flex-1 rounded-lg bg-gradient-to-r from-orange-500 to-rose-500 py-1.5 text-center text-[10px] font-black text-white">
                  ✓
                </span>
                <span className="flex-1 rounded-lg bg-slate-100 py-1.5 text-center text-[10px] font-black text-slate-600">
                  🖨
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─────────────────────── Slide 3 · Kitchen screen ─────────────────────── */

function KitchenSlide({ L }: { L: ShowcaseDict }) {
  const [stage, setStage] = useState(0); // 0 new → 1 preparing → 2 ready
  useEffect(() => {
    const iv = setInterval(() => setStage((s) => (s + 1) % 3), 1500);
    return () => clearInterval(iv);
  }, []);
  const stages = [
    { label: L.showcaseNew, chip: "bg-orange-100 text-orange-700 ring-orange-200", bar: "from-orange-400 to-amber-400", width: "30%" },
    { label: L.showcasePreparing, chip: "bg-sky-100 text-sky-700 ring-sky-200", bar: "from-sky-400 to-indigo-400", width: "65%" },
    { label: L.showcaseReady, chip: "bg-emerald-100 text-emerald-700 ring-emerald-200", bar: "from-emerald-400 to-teal-400", width: "100%" },
  ];
  const current = stages[stage];

  return (
    <div className="mx-auto max-w-md space-y-3">
      {/* The order moving through stages */}
      <motion.div
        animate={{ scale: stage === 2 ? [1, 1.02, 1] : 1 }}
        className={cn(
          "rounded-2xl bg-white p-4 ring-2 transition-colors",
          stage === 2 ? "ring-emerald-300" : "ring-slate-200",
        )}
      >
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm font-black text-slate-900">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-orange-500 to-rose-500 text-[10px] font-black text-white">
              #43
            </span>
            {L.showcaseTable} 5
          </p>
          <motion.span
            key={stage}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn("rounded-full px-3 py-1 text-[11px] font-black ring-1", current.chip)}
          >
            {stage === 2 ? `✓ ${current.label}` : current.label}
          </motion.span>
        </div>
        <div className="mt-3 space-y-1 text-xs font-semibold text-slate-600">
          <p>1× Zinger Burger</p>
          <p>1× Chicken Karahi</p>
          <p>1× Loaded Fries</p>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <motion.div
            animate={{ width: current.width }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
            className={cn("h-full rounded-full bg-gradient-to-r", current.bar)}
          />
        </div>
      </motion.div>

      {/* Stage indicators */}
      <div className="flex items-center justify-center gap-2">
        {stages.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2">
            <motion.span
              animate={i === stage ? { scale: [1, 1.15, 1] } : {}}
              className={cn(
                "grid h-7 w-7 place-items-center rounded-full text-[11px] font-black transition-colors",
                i <= stage ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500",
              )}
            >
              {i + 1}
            </motion.span>
            <span className={cn("text-xs font-bold", i === stage ? "text-slate-900" : "text-slate-400")}>
              {s.label}
            </span>
            {i < stages.length - 1 && <span className="h-px w-6 bg-slate-300" />}
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-slate-500">
        <CookingPot className="me-1 inline h-3.5 w-3.5 text-orange-500" />
        #43 · Zinger Burger · Chicken Karahi · Loaded Fries
      </p>
    </div>
  );
}

/* ─────────────────────── Slide 4 · Sales dashboard ─────────────────────── */

const WEEK_BARS = [42, 68, 51, 82, 60, 95, 74];
const TOP_ITEMS = [
  { emoji: "🍔", name: "Zinger Burger", share: 92 },
  { emoji: "🍕", name: "Pizza Slice", share: 71 },
  { emoji: "☕", name: "Karak Chai", share: 55 },
];

function SalesSlide({ L }: { L: ShowcaseDict }) {
  const cur = useVisitorCurrency();
  return (
    <div className="grid gap-4 sm:grid-cols-[1.2fr_1fr]">
      {/* Stats + chart */}
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: L.showcaseTodaySales, value: 18450, icon: TrendingUp, tint: "from-orange-500 to-rose-500" },
            { label: L.showcaseOrders, value: 47, icon: Receipt, tint: "from-sky-500 to-indigo-500" },
            { label: L.showcaseAvgOrder, value: 392, icon: BarChart3, tint: "from-violet-500 to-fuchsia-500" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
              <span className={cn("grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br text-white", stat.tint)}>
                <stat.icon className="h-3.5 w-3.5" />
              </span>
              <p className="mt-2 text-sm font-black text-slate-900">
                {cur} <CountUp to={stat.value} />
              </p>
              <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl bg-slate-950 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{L.showcaseThisWeek}</p>
          <div className="mt-3 flex h-28 items-end justify-between gap-2">
            {WEEK_BARS.map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: "4%" }}
                animate={{ height: `${h}%` }}
                transition={{ delay: 0.15 + i * 0.09, type: "spring", stiffness: 120, damping: 16 }}
                className={cn(
                  "flex-1 rounded-t-lg",
                  i === 5
                    ? "bg-gradient-to-t from-orange-500 to-amber-400 shadow-lg shadow-orange-500/40"
                    : "bg-gradient-to-t from-slate-700 to-slate-500",
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Best sellers */}
      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
          <Flame className="h-4 w-4 text-orange-500" /> {L.showcaseTopItems}
        </p>
        <div className="mt-4 space-y-4">
          {TOP_ITEMS.map((item, i) => (
            <div key={item.name}>
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-2">
                  <span className="text-base">{item.emoji}</span> {item.name}
                </span>
                <span className="text-slate-500">{item.share}%</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: `${item.share}%` }}
                  transition={{ delay: 0.3 + i * 0.15, duration: 0.7, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-rose-500"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-xl bg-emerald-50 p-3 text-center ring-1 ring-emerald-100">
          <p className="text-lg font-black text-emerald-600">▲ 12.4%</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600/70">
            {L.showcaseTodaySales}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Section shell ─────────────────────────── */

const SLIDES = ["pos", "qr", "kitchen", "sales"] as const;
type SlideKey = (typeof SLIDES)[number];
const SLIDE_MS = 7000;

type StringKey = { [K in keyof ShowcaseDict]: ShowcaseDict[K] extends string ? K : never }[keyof ShowcaseDict];

const SLIDE_META: Record<SlideKey, { icon: typeof MonitorSmartphone; title: StringKey; desc: StringKey }> = {
  pos: { icon: ShoppingBasket, title: "showcasePosTitle", desc: "showcasePosDesc" },
  qr: { icon: QrCode, title: "showcaseQrTitle", desc: "showcaseQrDesc" },
  kitchen: { icon: CookingPot, title: "showcaseKitchenTitle", desc: "showcaseKitchenDesc" },
  sales: { icon: LayoutDashboard, title: "showcaseSalesTitle", desc: "showcaseSalesDesc" },
};

export function ShowcaseSection() {
  const { t } = useI18n();
  const L = t.landing;
  const [active, setActive] = useState<SlideKey>("pos");
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const iv = setInterval(() => {
      setActive((cur) => SLIDES[(SLIDES.indexOf(cur) + 1) % SLIDES.length]);
    }, SLIDE_MS);
    return () => clearInterval(iv);
  }, [paused, active]);

  const meta = SLIDE_META[active];
  const TitleIcon = meta.icon;

  return (
    <section className="mx-auto max-w-7xl px-5 py-20">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-2xl text-center"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-4 py-1.5 text-sm font-semibold text-orange-700 shadow-sm">
          <MonitorSmartphone className="h-4 w-4" /> {L.showcaseLabel}
        </span>
        <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{L.showcaseTitle}</h2>
        <p className="mt-3 text-lg text-slate-600">{L.showcaseSubtitle}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.12 }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        className="mt-12"
      >
        {/* Tabs */}
        <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-2">
          {SLIDES.map((key) => {
            const Icon = SLIDE_META[key].icon;
            const on = key === active;
            return (
              <button
                key={key}
                onClick={() => setActive(key)}
                className={cn(
                  "relative overflow-hidden rounded-full px-4 py-2 text-sm font-bold transition",
                  on ? "bg-slate-900 text-white shadow-lg" : "bg-white/80 text-slate-500 ring-1 ring-slate-200 hover:text-slate-900",
                )}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Icon className="h-4 w-4" /> {L.showcaseTabs[key]}
                </span>
                {on && !paused && (
                  <motion.span
                    key={active}
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: SLIDE_MS / 1000, ease: "linear" }}
                    className="absolute bottom-0 start-0 h-0.5 bg-gradient-to-r from-orange-400 to-rose-400"
                  />
                )}
                {on && paused && <span className="absolute bottom-0 start-0 h-0.5 w-full bg-gradient-to-r from-orange-400 to-rose-400" />}
              </button>
            );
          })}
        </div>

        {/* Slide stage */}
        <div className="relative mx-auto mt-8 max-w-4xl overflow-hidden rounded-[2rem] border border-white bg-gradient-to-br from-white/90 to-orange-50/60 p-5 shadow-[0_25px_60px_-25px_rgba(15,23,42,0.3)] backdrop-blur sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-orange-300/40 to-rose-300/30 blur-3xl" />
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, x: 42 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -42 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mb-6 flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/30">
                  <TitleIcon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                    {L[meta.title]}
                  </h3>
                  <p className="text-sm text-slate-500">{L[meta.desc]}</p>
                </div>
              </div>

              {active === "pos" && <PosSlide L={L} />}
              {active === "qr" && <QrSlide L={L} />}
              {active === "kitchen" && <KitchenSlide L={L} />}
              {active === "sales" && <SalesSlide L={L} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dots */}
        <div className="mt-6 flex justify-center gap-2">
          {SLIDES.map((key) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              aria-label={L.showcaseTabs[key]}
              className={cn(
                "h-2 rounded-full transition-all",
                key === active ? "w-8 bg-gradient-to-r from-orange-500 to-rose-500" : "w-2 bg-slate-300 hover:bg-slate-400",
              )}
            />
          ))}
        </div>
      </motion.div>
    </section>
  );
}
