"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { animate, motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Camera,
  ChefHat,
  Globe2,
  Receipt,
  ShieldCheck,
  Zap,
  Code2,
  Sparkles,
} from "lucide-react";
import { useI18n } from "@/components/providers/language-provider";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, cn } from "@/components/ui";
import { currencyForCountry, detectCountryFromLocale } from "@/lib/countries";

/** Visitor's local currency symbol (Rs for PK, $ for US, £ for UK, ...). */
function useVisitorCurrency() {
  const [symbol, setSymbol] = useState("Rs");
  useEffect(() => {
    setSymbol(currencyForCountry(detectCountryFromLocale()));
  }, []);
  return symbol;
}

function Counter({ to, duration = 2 }: { to: number; duration?: number }) {
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

const demoItems = [
  { emoji: "🍔", name: "Zinger Burger", price: 450, qty: 2 },
  { emoji: "🍕", name: "Pizza Slice", price: 320, qty: 1 },
  { emoji: "🥤", name: "Cold Drink", price: 120, qty: 3 },
];

function PosPreview({ labels }: { labels: { total: string; change: string; items: string; paid: string } }) {
  const cur = useVisitorCurrency();
  const total = demoItems.reduce((s, i) => s + i.price * i.qty, 0);
  const received = 2000;
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateX: 12 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      className="relative w-full max-w-md [perspective:1200px]"
    >
      <div className="absolute -inset-6 rounded-[3rem] bg-gradient-to-tr from-orange-400/40 via-rose-400/30 to-amber-300/40 blur-3xl animate-gradient" />
      <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-2xl shadow-orange-900/10 backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 text-white">
              <ChefHat className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900">Kitchen POS</p>
              <p className="text-xs text-slate-500">#1042</p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Live
          </span>
        </div>

        <div className="space-y-2.5">
          {demoItems.map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.25, type: "spring", stiffness: 200, damping: 20 }}
              className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-2xl shadow-sm">
                {item.emoji}
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                <p className="text-xs text-slate-500">
                  {item.qty} × {cur} {item.price}
                </p>
              </div>
              <span className="text-sm font-bold text-slate-900">{cur} {item.price * item.qty}</span>
            </motion.div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white">
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span>{labels.total}</span>
            <span className="text-xs">{labels.items}: {demoItems.reduce((s, i) => s + i.qty, 0)}</span>
          </div>
          <p className="mt-1 text-3xl font-black tracking-tight">
            {cur} <Counter to={total} />
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-white/10 p-2.5">
              <p className="text-xs text-slate-300">{labels.paid}</p>
              <p className="font-bold">{cur} {received.toLocaleString("en-US")}</p>
            </div>
            <div className="rounded-xl bg-emerald-400/20 p-2.5">
              <p className="text-xs text-emerald-200">{labels.change}</p>
              <p className="font-bold text-emerald-300">
                {cur} <Counter to={received - total} duration={2.4} />
              </p>
            </div>
          </div>
        </div>
      </div>

      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -left-6 top-10 hidden rounded-2xl bg-white p-3 shadow-xl sm:block"
      >
        <p className="text-xs text-slate-500">Today</p>
        <p className="text-lg font-black text-slate-900">{cur} 18,450</p>
        <p className="text-xs font-semibold text-emerald-600">▲ 12.4%</p>
      </motion.div>
    </motion.div>
  );
}

const features = [
  { key: "f1", icon: Camera, color: "from-orange-500 to-amber-400" },
  { key: "f2", icon: Zap, color: "from-rose-500 to-pink-500" },
  { key: "f3", icon: Receipt, color: "from-emerald-500 to-teal-400" },
  { key: "f4", icon: BarChart3, color: "from-sky-500 to-indigo-500" },
  { key: "f5", icon: Globe2, color: "from-violet-500 to-fuchsia-500" },
  { key: "f6", icon: ShieldCheck, color: "from-slate-700 to-slate-900" },
] as const;

export function LandingPage({ loggedIn }: { loggedIn: boolean }) {
  const { t, isUrdu } = useI18n();
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -80]);
  const L = t.landing;

  return (
    <div className="relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-[28rem] w-[28rem] animate-blob bg-gradient-to-br from-orange-300/50 to-amber-200/40 blur-3xl" />
        <div className="absolute -right-24 top-1/3 h-[24rem] w-[24rem] animate-blob bg-gradient-to-br from-rose-300/40 to-pink-200/40 blur-3xl [animation-delay:-6s]" />
        <div className="absolute bottom-0 left-1/3 h-[22rem] w-[22rem] animate-blob bg-gradient-to-br from-sky-200/40 to-emerald-200/40 blur-3xl [animation-delay:-12s]" />
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/50 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/30">
              <ChefHat className="h-5 w-5" />
            </span>
            <span className="text-lg font-black tracking-tight text-slate-900">{t.appName}</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle compact />
            <LanguageToggle compact />
            {loggedIn ? (
              <Link href="/dashboard">
                <Button size="md">{t.openDashboard}</Button>
              </Link>
            ) : (
              <>
                <Link href="/login" className="hidden sm:block">
                  <Button variant="ghost">{t.login}</Button>
                </Link>
                <Link href="/features" className="hidden sm:block">
                  <Button variant="ghost">{L.featuresNav}</Button>
                </Link>
                <Link href="/signup">
                  <Button size="md">{t.signup}</Button>
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-14 lg:grid-cols-2 lg:pt-20">
        <motion.div style={{ y: heroY }} className="relative z-10">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-4 py-1.5 text-sm font-semibold text-orange-700 shadow-sm"
          >
            <Sparkles className="h-4 w-4 animate-pulse" /> {L.badge}
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 text-[clamp(2.4rem,6vw,4.4rem)] font-black leading-[1.08] tracking-tight text-slate-950"
          >
            {L.heroTitle}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="mt-3 bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 bg-[length:200%_auto] bg-clip-text text-[clamp(1.4rem,3.4vw,2.2rem)] font-extrabold text-transparent animate-gradient"
          >
            {L.heroHighlight}
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className={cn("mt-6 max-w-xl text-lg text-slate-600", isUrdu ? "leading-loose" : "leading-relaxed")}
          >
            {L.heroSubtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.8 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Link href={loggedIn ? "/dashboard" : "/signup"}>
              <Button size="lg" className="group">
                {loggedIn ? t.openDashboard : t.getStarted}
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
              </Button>
            </Link>
            {!loggedIn && (
              <Link href="/login">
                <Button variant="secondary" size="lg">
                  {t.login}
                </Button>
              </Link>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="mt-10 flex flex-wrap items-center gap-6 text-sm text-slate-500"
          >
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> {t.auth.demoHint}
            </span>
            <span className="flex items-center gap-2">
              <Code2 className="h-4 w-4" /> Open source
            </span>
          </motion.div>
        </motion.div>

        <div className="relative z-10 flex justify-center lg:justify-end">
          <PosPreview
            labels={{ total: L.liveTotal, change: L.liveChange, items: L.liveItems, paid: t.pos.received }}
          />
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-5 py-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{L.featuresTitle}</h2>
          <p className="mt-3 text-lg text-slate-600">{L.featuresSubtitle}</p>
        </motion.div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.key}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -8 }}
                className="group relative overflow-hidden rounded-3xl border border-white bg-white/80 p-7 shadow-[0_10px_40px_-15px_rgba(15,23,42,0.2)] backdrop-blur"
              >
                <div
                  className={cn(
                    "mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110",
                    f.color,
                  )}
                >
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">{L[`${f.key}Title` as "f1Title"]}</h3>
                <p className="mt-2 leading-relaxed text-slate-600">{L[`${f.key}Desc` as "f1Desc"]}</p>
                <div className="pointer-events-none absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-gradient-to-br opacity-0 blur-2xl transition duration-500 group-hover:opacity-30 from-orange-400 to-rose-400" />
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 px-6 py-16 text-white sm:px-12">
          <div className="pointer-events-none absolute inset-0 opacity-40">
            <div className="absolute -top-20 left-1/4 h-80 w-80 animate-blob rounded-full bg-orange-500/40 blur-3xl" />
            <div className="absolute -bottom-20 right-1/4 h-80 w-80 animate-blob rounded-full bg-rose-500/30 blur-3xl [animation-delay:-8s]" />
          </div>
          <h2 className="relative text-center text-3xl font-black tracking-tight sm:text-4xl">{L.howTitle}</h2>
          <div className="relative mt-14 grid gap-8 md:grid-cols-3">
            {[L.step1, L.step2, L.step3].map((step, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
                className="rounded-3xl border border-white/10 bg-white/5 p-7 backdrop-blur"
              >
                <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 text-xl font-black shadow-lg shadow-orange-500/40 animate-pulse-soft">
                  {i + 1}
                </div>
                <p className="text-lg font-semibold leading-relaxed text-slate-100">{step}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why it fits */}
      <section className="mx-auto max-w-7xl px-5 py-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-[2.5rem] bg-gradient-to-br from-orange-600 via-rose-500 to-amber-500 p-[1px] shadow-2xl shadow-orange-500/25"
        >
          <div className="rounded-[2.5rem] bg-white/90 px-8 py-12 text-center backdrop-blur md:px-16 md:py-16">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{L.whyTitle}</h2>
            <p className="mx-auto mt-5 max-w-3xl text-lg leading-relaxed text-slate-600">{L.whyText1}</p>
            <p className="mx-auto mt-3 max-w-3xl text-lg leading-relaxed text-slate-600">{L.whyText2}</p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <span className="rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200">✓ Offline-capable</span>
              <span className="rounded-full bg-orange-50 px-4 py-1.5 text-sm font-bold text-orange-700 ring-1 ring-orange-200">✓ QR self-ordering included</span>
              <span className="rounded-full bg-violet-50 px-4 py-1.5 text-sm font-bold text-violet-700 ring-1 ring-violet-200">✓ 9 optional add-ons</span>
            </div>
            <Link href="/features">
              <Button size="lg" className="mt-9 shadow-lg shadow-orange-500/40">{L.featuresNav}</Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-5 pb-20 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="rounded-[2.5rem] bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 bg-[length:200%_200%] p-10 text-white shadow-2xl shadow-orange-500/30 animate-gradient sm:p-14"
        >
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{L.ctaTitle}</h2>
          <p className="mx-auto mt-3 max-w-xl text-lg text-orange-50">{L.ctaSubtitle}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={loggedIn ? "/dashboard" : "/signup"}>
              <Button size="lg" className="bg-white bg-none !text-orange-600 shadow-xl ring-0 hover:bg-orange-50 hover:!brightness-100">
                {loggedIn ? t.openDashboard : t.getStarted}
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-white/70 bg-white/50 px-5 py-8 text-center text-sm text-slate-500 backdrop-blur">
        <div className="flex flex-wrap items-center justify-center gap-2 font-semibold text-slate-700">
          <span>{t.appName}</span> · <LanguageToggle compact className="ms-2 align-middle" />
        </div>
        <p className="mt-2">
          <Link href="/features" className="mx-2 underline underline-offset-2 hover:text-orange-600">{L.featuresNav}</Link>·
          <Link href="/login" className="mx-2 underline underline-offset-2 hover:text-orange-600">{t.login}</Link>
        </p>
        <p className="mt-2">{L.footer}</p>
      </footer>
    </div>
  );
}
