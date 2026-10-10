import Link from "next/link";
import {
  LayoutDashboard, ShoppingBasket, CookingPot, UtensilsCrossed, Users,
  TrendingUp, Radio, Percent, Landmark, ArrowRight, Check,
  Sparkles, Boxes, RefreshCcw, PackageX, Phone, QrCode, Plus, Store,
  ClipboardList, Sheet, Smartphone, WifiOff, Printer, ArrowLeft,
} from "lucide-react";

export const metadata = {
  title: "Features — Kitchen POS · One POS, every superpower",
  description:
    "Explore Kitchen POS features: a powerful free core plus 9 optional add-ons — discounts, payment methods, stock alerts, voids, item extras, printed table QRs, cash shifts, profit tracking and a WhatsApp customer button. English-first, offline-capable, self-ordering QR menu included.",
};

const core = [
  { icon: LayoutDashboard, name: "Dashboard", desc: "Sales, chart, top items, today's numbers at a glance" },
  { icon: Smartphone, name: "POS Terminal", desc: "Fast tap-to-sell billing, change calculator, daily or running counter" },
  { icon: WifiOff, name: "Offline PWA", desc: "Installs on mobile & desktop, keeps selling without internet" },
  { icon: CookingPot, name: "Kitchen Screen", desc: "Live screen marked done by the cook as each order completes" },
  { icon: QrCode, name: "QR Self-Ordering", desc: "Free QR menu — guests order from their phone, order lands inside" },
  { icon: Printer, name: "Receipt Printer", desc: "Thermal / PDF receipts one tap away" },
  { icon: Users, name: "Staff Accounts", desc: "Separate cashier logins, per-staff commission & credit sales" },
  { icon: TrendingUp, name: "Sales Reports", desc: "Daily totals, item reports, monthly trend — exportable" },
];

const addons = [
  {
    icon: Percent, name: "Discounts", tagline: "Win the deal, keep the margin",
    desc: "Percent or flat discounts at checkout with full control — server-verified, capped, and shown clearly on the receipt.",
    points: ["% or flat — applied in one tap", "Caps prevent mistakes", "Receipt shows the breakdown"],
  },
  {
    icon: Landmark, name: "Payment Methods", tagline: "Cash, card, wallets — all split out",
    desc: "Track how customers actually pay: cash, card, JazzCash, Easypaisa, bank transfer. Day-close shows a clean per-method split.",
    points: ["5 payment methods", "Day-close payment split chips", "Audit-ready records"],
  },
  {
    icon: Boxes, name: "Stock Alerts", tagline: "Never sell what you don't have",
    desc: "Optional stock quantity per item. POS and guest orders consume stock live, sold-out items lock themselves, low items warn early.",
    points: ["Live stock on every sale", "Sold-out badge auto-locks POS", "409 guard against overselling"],
  },
  {
    icon: PackageX, name: "Order Voids", tagline: "Fix mistakes without breaking books",
    desc: "Owner-only void with a required reason. The order stays visible with a red chip — revenue, stock and reports stay 100% accurate.",
    points: ["Owner-only + mandatory reason", "Voided clearly marked everywhere", "Reports exclude voids automatically"],
  },
  {
    icon: Plus, name: "Item Extras", tagline: "Sizes & add-ons on every item",
    desc: 'Attach up to 10 extras to any item: "Large +120", "Extra cheese +80". One tap in POS and on the QR menu — item name and price snap onto the order.',
    points: ["Up to 10 extras per item", "Recomputed server-side, always safe", "Works on POS & QR menu"],
  },
  {
    icon: QrCode, name: "Printed Table QRs", tagline: "Every table orders by itself",
    desc: "Enter your table count, print a sheet of QR cards — each table gets its own QR. Guest scans → orders it themselves → order arrives tagged.",
    points: ["2–60 tables supported", "One click: print all table cards", "Orders auto-tagged with table number"],
  },
  {
    icon: Store, name: "Cash Shift", tagline: "Open & close the drawer, counted",
    desc: "Open a shift with starting cash, close it with a quick count. System computes the expected number automatically.",
    points: ["Expected cash auto-computed", "Red / green difference instantly", "History of last shifts at day-close"],
  },
  {
    icon: TrendingUp, name: "Cost & Profit", tagline: "See your real daily profit",
    desc: "Add each item's cost once — the Sales day-close then shows item margin and true net profit for the day. Know exactly what you take home.",
    points: ["Cost price per item", "Item margin chip", "Net profit = margin − expenses"],
  },
  {
    icon: Phone, name: "WhatsApp Customer", tagline: "Customers contact you instantly",
    desc: "Store the customer's phone with the order and chat on WhatsApp right from the receipt — order-ready updates and repeat orders flow in.",
    points: ["Phone stored with order", "wa.me deep-link button on receipt", "No paid API — just opens WhatsApp"],
  },
];

const steps = [
  { icon: Sparkles, t: "Pick your add-ons", d: "Settings → Add-ons — flip the switches you need. Off by default; your simple system stays untouched." },
  { icon: Smartphone, t: "Sell faster", d: "POS, QR menu and kitchen screen work together — offline-capable, on any phone." },
  { icon: TrendingUp, t: "Watch profit", d: "Day-close shows revenue, expenses, item margin and net profit — share it in one tap." },
];

export default function FeaturesPage() {
  return (
    <div dir="ltr" className="min-h-svh bg-[#0a0a10] text-white antialiased overflow-x-hidden">
      <style>{`
        @keyframes floaty { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        @keyframes rise { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        .rise { opacity:0; animation: rise .7s cubic-bezier(.2,.65,.3,1) forwards }
        .d1{animation-delay:.05s}.d2{animation-delay:.15s}.d3{animation-delay:.25s}.d4{animation-delay:.35s}
        .card-rise { animation: rise .7s cubic-bezier(.2,.65,.3,1) both }
      `}</style>

      {/* ambient background */}
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 -left-40 h-[480px] w-[480px] rounded-full bg-orange-600/25 blur-[120px]" style={{ animation: "floaty 9s ease-in-out infinite" }} />
        <div className="absolute top-1/3 -right-52 h-[520px] w-[520px] rounded-full bg-rose-600/20 blur-[130px]" style={{ animation: "floaty 12s ease-in-out infinite" }} />
        <div className="absolute -bottom-48 left-1/4 h-[420px] w-[420px] rounded-full bg-amber-500/15 blur-[120px]" style={{ animation: "floaty 11s ease-in-out infinite" }} />
      </div>

      {/* nav */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0a0a10]/75 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-4">
          <Link href="/" className="flex items-center gap-2 font-black tracking-tight">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 text-lg shadow-lg shadow-orange-900/50">🍳</span>
            Kitchen POS
          </Link>
          <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-orange-200 ring-1 ring-white/10">Features</span>
          <div className="ms-auto flex items-center gap-2">
            <Link href="/" className="hidden rounded-full px-4 py-2 text-sm font-bold text-white/70 transition hover:text-white sm:block">
              <span className="inline-flex items-center gap-1.5"><ArrowLeft className="h-4 w-4" /> Home</span>
            </Link>
            <Link href="/signup" className="rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-5 py-2 text-sm font-extrabold shadow-lg shadow-orange-900/50 transition hover:brightness-110">
              Start free
            </Link>
          </div>
        </nav>
      </header>

      {/* hero */}
      <section className="relative mx-auto max-w-4xl px-5 pb-16 pt-16 text-center sm:pt-24">
        <p className="rise d1 mx-auto inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-orange-300 ring-1 ring-white/10">
          <Sparkles className="h-3.5 w-3.5" /> Everything, explained
        </p>
        <h1 className="rise d2 mt-6 text-4xl font-black tracking-tight sm:text-6xl">
          One POS.
          <span className="block bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400 bg-clip-text text-transparent">
            Every superpower your restaurant needs.
          </span>
        </h1>
        <p className="rise d3 mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/60 sm:text-lg">
          Kitchen POS starts clean and simple. When you want more — flip one of the <b className="text-white/90">9 add-ons</b> in Settings.
          No clutter, no complexity: each feature appears only when you switch it on.
        </p>
      </section>

      {/* core engine */}
      <section className="relative mx-auto max-w-6xl px-5 pb-6">
        <div className="mx-auto mb-8 flex items-center gap-3">
          <span className="h-px flex-1 bg-white/10" />
          <p className="text-xs font-bold uppercase tracking-widest text-white/40">The core engine — free, always on</p>
          <span className="h-px flex-1 bg-white/10" />
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {core.map((c, i) => (
            <li key={c.name} className="card-rise rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10 backdrop-blur transition hover:bg-white/[0.07] hover:ring-white/20" style={{ animationDelay: `${i * 60}ms` }}>
              <c.icon className="h-5 w-5 text-orange-400" />
              <p className="mt-2.5 text-sm font-extrabold">{c.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/50">{c.desc}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* add-ons bento grid */}
      <section className="relative mx-auto max-w-6xl px-5 py-14">
        <div className="mx-auto mb-10 flex items-center gap-3">
          <span className="h-px flex-1 bg-white/10" />
          <p className="text-xs font-bold uppercase tracking-widest text-white/40">9 optional add-ons — turn on what you need</p>
          <span className="h-px flex-1 bg-white/10" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {addons.map((a, i) => (
            <div key={a.name}
              className="card-rise group relative rounded-3xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-[1px] ring-1 ring-white/10 transition hover:ring-orange-400/50"
              style={{ animationDelay: `${0.1 + i * 70}ms` }}
            >
              <div className="relative h-full rounded-3xl bg-[#0d0d13] p-6 transition group-hover:bg-[#101018]">
                <div className="flex items-start justify-between">
                  <span className="text-3xl font-black text-white/15">{String(i + 1).padStart(2, "0")}</span>
                  <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/20">Opt-in</span>
                </div>
                <div className="mt-3 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-orange-500/25 to-rose-500/25 ring-1 ring-white/10">
                  <a.icon className="h-5 w-5 text-orange-300" />
                </div>
                <h3 className="mt-4 text-lg font-extrabold tracking-tight">{a.name}</h3>
                <p className="text-sm font-semibold text-orange-300/90">{a.tagline}</p>
                <p className="mt-2.5 text-sm leading-relaxed text-white/55">{a.desc}</p>
                <ul className="mt-4 space-y-1.5">
                  {a.points.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-xs text-white/60">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" /> {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* how it flows */}
      <section className="relative mx-auto max-w-6xl px-5 py-10">
        <div className="rounded-[2.5rem] bg-gradient-to-r from-orange-500/15 via-rose-500/15 to-amber-500/15 p-[1px] ring-1 ring-white/10">
          <div className="grid gap-8 rounded-[2.5rem] bg-[#0c0c12]/95 p-8 sm:grid-cols-3 sm:p-12">
            {steps.map((s, i) => (
              <div key={s.t} className="relative">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.06] ring-1 ring-white/10">
                  <s.icon className="h-5 w-5 text-orange-300" />
                </div>
                <p className="mt-4 text-sm font-bold text-white/40">STEP {i + 1}</p>
                <h3 className="mt-1 text-xl font-extrabold">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{s.d}</p>
                {i < 2 && <ArrowRight className="absolute -right-6 top-3 hidden h-5 w-5 text-white/20 sm:block" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* final CTA */}
      <section className="relative mx-auto max-w-4xl px-5 py-16 text-center">
        <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
          Ready when you are —
          <span className="bg-gradient-to-r from-amber-300 to-rose-400 bg-clip-text text-transparent"> flipping switches is free</span>
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-white/55">
          Keep the simple core, or turn on add-ons one by one as your restaurant grows. Either way — no per-feature charges, no surprises.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/signup" className="rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-8 py-3.5 text-sm font-extrabold shadow-xl shadow-orange-900/40 transition hover:brightness-110">
            Start free <ArrowRight className="ml-1 inline h-4 w-4" />
          </Link>
          <Link href="/login" className="rounded-full bg-white/[0.06] px-8 py-3.5 text-sm font-bold ring-1 ring-white/15 transition hover:bg-white/10">
            Log in
          </Link>
        </div>
      </section>

      <footer className="relative border-t border-white/10 px-5 py-8 text-center text-sm text-white/40">
        <p className="font-semibold text-white/60">Kitchen POS</p>
        <p className="mt-1">© 2026 Developed By Shayan Ali.</p>
      </footer>
    </div>
  );
}
