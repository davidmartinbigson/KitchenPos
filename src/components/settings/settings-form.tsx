"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Coins, Globe2, LogOut, Mail, Printer, Receipt, Save, Store, UserRound } from "lucide-react";
import { useI18n } from "@/components/providers/language-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Button, Card, Field, Input, Select, cn, errorText } from "@/components/ui";
import type { Lang } from "@/lib/i18n";
import { ADDON_KEYS, READY_ADDONS } from "@/lib/addons";
import { COUNTRIES, currencyForCountry } from "@/lib/countries";

const CURRENCY_PRESETS = ["Rs", "PKR", "$", "€", "£", "₹", "AED"];

export function SettingsForm({
  initial,
}: {
  initial: {
    name: string;
    email: string;
    shopName: string;
    currency: string;
    country: string;
    language: Lang;
    dailyOrderReset: boolean;
    addons?: Record<string, boolean>;
    tableCount?: number;
    receiptHeader?: string;
    receiptFooter?: string;
    receiptLogo?: string | null;
    receiptSize?: string;
  };
}) {
  const { t, lang, setLang } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [shopName, setShopName] = useState(initial.shopName);
  const [country, setCountry] = useState(initial.country || "PK");
  const [currency, setCurrency] = useState(initial.currency);
  const [language, setLanguage] = useState<Lang>(initial.language);
  const [dailyCounter, setDailyCounter] = useState(initial.dailyOrderReset);
  const [addons, setAddons] = useState<Record<string, boolean>>(initial.addons ?? {});
    const [tableCount, setTableCount] = useState(String(initial.tableCount ?? 12));
  const [receiptHeader, setReceiptHeader] = useState(initial.receiptHeader ?? "");
  const [receiptFooter, setReceiptFooter] = useState(initial.receiptFooter ?? "");
  const [receiptLogo, setReceiptLogo] = useState(initial.receiptLogo ?? "");
  const [receiptSize, setReceiptSize] = useState(initial.receiptSize ?? "80");

  function onReceiptLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 240 / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
        setReceiptLogo(canvas.toDataURL("image/jpeg", 0.85));
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
    e.target.value = "";
  }
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName,
          country,
          currency,
          language,
          dailyOrderReset: dailyCounter,
          addons,
          tableCount: Number(tableCount) || 12,
          receiptHeader,
          receiptFooter,
          receiptLogo,
          receiptSize,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.show(errorText(data.error, t), "error");
      } else {
        setLang(language);
        toast.show(t.settings.saved, "success");
        router.refresh();
      }
    } catch {
      toast.show(t.networkError, "error");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const languages: { value: Lang; title: string; sub: string; sample: string }[] = [
    { value: "en", title: "English", sub: "Default", sample: "Sell faster. Know your numbers." },
    { value: "ur", title: "اردو", sub: "Urdu", sample: "تیزی سے بیچیں۔ اپنے حساب کتاب کو جانیں۔" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black tracking-tight text-slate-950">{t.settings.title}</h1>
        <p className="mt-1 text-slate-600">{t.settings.subtitle}</p>
      </header>

      <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card className="p-6 sm:p-8">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-900">
              <Store className="h-5 w-5 text-orange-500" /> {t.settings.profile}
            </h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t.settings.shopName}>
                <Input required maxLength={120} value={shopName} onChange={(e) => setShopName(e.target.value)} />
              </Field>
              <Field label={t.settings.country} hint={t.settings.countryHint}>
                <Select
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    setCurrency(currencyForCountry(e.target.value));
                  }}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} — {c.currencySymbol} {c.currencyCode}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="mt-5">
              <Field label={t.settings.currency} hint={t.settings.currencyHint}>
                <Input required maxLength={8} value={currency} onChange={(e) => setCurrency(e.target.value)} />
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {CURRENCY_PRESETS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-xs font-bold ring-1 transition",
                    currency === c
                      ? "bg-slate-900 text-white ring-slate-900"
                      : "bg-white text-slate-600 ring-slate-200 hover:ring-orange-300",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <Receipt className="h-5 w-5 text-orange-500" /> {t.settings.dailyCounterTitle}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{t.settings.dailyCounterDesc}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={dailyCounter}
                onClick={() => setDailyCounter((v) => !v)}
                className={cn(
                  "relative h-7 w-12 shrink-0 rounded-full transition",
                  dailyCounter ? "bg-emerald-500" : "bg-slate-300",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all",
                    dailyCounter ? "start-[22px]" : "start-0.5",
                  )}
                />
              </button>
            </div>
          </Card>

          <Card className="p-6 sm:p-8">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Receipt className="h-5 w-5 text-orange-500" /> {t.settings.addonsTitle}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{t.settings.addonsDesc}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {ADDON_KEYS.filter((key) =>
                READY_ADDONS.includes(key as (typeof READY_ADDONS)[number]),
              ).map((key) => {
                const ready = true;
                const meta = (t.settings.addonList as Record<string, { name: string; desc: string }>)[key];
                const on = addons[key] === true;
                return (
                  <div
                    key={key}
                    className={cn(
                      "flex items-start justify-between gap-3 rounded-2xl p-3.5 ring-1 transition",
                      on ? "bg-emerald-50 ring-emerald-200" : "bg-slate-50 ring-slate-200",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-bold text-slate-800">
                        {meta?.name ?? key}
                        {!ready && (
                          <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
                            {t.settings.addonComingSoon}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">{meta?.desc}</p>
                    </div>
                    {ready ? (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={on}
                        onClick={() => setAddons((prev) => ({ ...prev, [key]: !on }))}
                        className={cn(
                          "relative h-6 w-11 shrink-0 rounded-full transition",
                          on ? "bg-emerald-500" : "bg-slate-300",
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                            on ? "start-[22px]" : "start-0.5",
                          )}
                        />
                      </button>
                    ) : (
                      <span className="h-6 w-11 shrink-0 rounded-full bg-slate-200" />
                    )}
                  </div>
                );
              })}
            </div>
            {addons.tables === true && (
              <div className="mt-4 flex items-center gap-3">
                <label className="text-sm font-semibold text-slate-700">{t.settings.tableCountLabel}</label>
                <Input
                  type="number"
                  min={2}
                  max={60}
                  value={tableCount}
                  onChange={(e) => setTableCount(e.target.value)}
                  className="w-24"
                />
              </div>
            )}
          </Card>

          {addons.receiptBrand === true && (
            <Card className="p-6 sm:p-8">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Printer className="h-5 w-5 text-orange-500" /> {t.settings.receiptTitle}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{t.settings.receiptDesc}</p>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{t.settings.receiptLogoLabel}</label>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer rounded-xl bg-orange-50 px-4 py-2 text-sm font-bold text-orange-700 ring-1 ring-orange-200 transition hover:bg-orange-100">
                      <input type="file" accept="image/*" className="hidden" onChange={onReceiptLogoFile} />
                      {t.settings.receiptLogoUpload}
                    </label>
                    {receiptLogo && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={receiptLogo} alt="" className="h-14 w-14 rounded-xl bg-slate-100 object-contain ring-1 ring-slate-200" />
                        <button
                          type="button"
                          onClick={() => setReceiptLogo("")}
                          className="text-sm font-semibold text-red-500 hover:text-red-600"
                        >
                          {t.settings.receiptLogoRemove}
                        </button>
                      </>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">{t.settings.receiptSizeHint}</p>
                  <div className="mt-3">
                    <label className="mb-1 block text-sm font-semibold text-slate-700">{t.settings.receiptSizeLabel}</label>
                    <select
                      value={receiptSize}
                      onChange={(e) => setReceiptSize(e.target.value)}
                      className="h-10 w-36 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
                    >
                      <option value="80">{t.settings.receiptSize80}</option>
                      <option value="58">{t.settings.receiptSize58}</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-4">
                  <Field label={t.settings.receiptHeaderLabel} hint={t.settings.receiptHeaderHint}>
                    <Input value={receiptHeader} onChange={(e) => setReceiptHeader(e.target.value)} maxLength={160} placeholder={t.settings.receiptHeaderPh} />
                  </Field>
                  <Field label={t.settings.receiptFooterLabel} hint={t.settings.receiptFooterHint}>
                    <Input value={receiptFooter} onChange={(e) => setReceiptFooter(e.target.value)} maxLength={160} placeholder={t.settings.receiptFooterPh} />
                  </Field>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-6 sm:p-8">
            <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-slate-900">
              <Globe2 className="h-5 w-5 text-orange-500" /> {t.settings.languageTitle}
            </h2>
            <p className="mb-6 text-sm text-slate-500">{t.settings.languageHint}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {languages.map((opt) => {
                const active = language === opt.value;
                return (
                  <motion.button
                    type="button"
                    key={opt.value}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setLanguage(opt.value)}
                    className={cn(
                      "relative overflow-hidden rounded-3xl p-5 text-start ring-2 transition",
                      active
                        ? "bg-gradient-to-br from-orange-500 to-rose-500 text-white ring-orange-400 shadow-xl shadow-orange-500/30"
                        : "bg-white text-slate-800 ring-slate-200 hover:ring-orange-300",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn("text-2xl font-black", opt.value === "ur" && "font-urdu")}>{opt.title}</span>
                      <span
                        className={cn(
                          "grid h-7 w-7 place-items-center rounded-full",
                          active ? "bg-white text-orange-600" : "bg-slate-100 text-transparent",
                        )}
                      >
                        <Check className="h-4 w-4" />
                      </span>
                    </div>
                    <p className={cn("mt-1 text-xs font-semibold", active ? "text-orange-100" : "text-slate-500")}>
                      {opt.sub}
                    </p>
                    <p className={cn("mt-4 text-sm", opt.value === "ur" && "font-urdu text-base leading-loose", active ? "text-white/95" : "text-slate-600")}>
                      {opt.sample}
                    </p>
                  </motion.button>
                );
              })}
            </div>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" size="lg" loading={saving}>
              <Save className="h-5 w-5" /> {saving ? t.saving : t.save}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-5 text-lg font-bold text-slate-900">{t.settings.account}</h2>
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-50 text-orange-600">
                  <UserRound className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs text-slate-500">{t.settings.name}</p>
                  <p className="font-semibold text-slate-900">{initial.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-600">
                  <Mail className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">{t.settings.email}</p>
                  <p className="truncate font-semibold text-slate-900">{initial.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Coins className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs text-slate-500">{t.settings.currency}</p>
                  <p className="font-semibold text-slate-900">{currency}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-2 text-lg font-bold text-slate-900">{t.settings.dangerTitle}</h2>
            <p className="mb-4 text-sm text-slate-500">{lang === "ur" ? "اس ڈیوائس سے لاگ آؤٹ کریں۔" : "Sign out of this device."}</p>
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-100"
            >
              <LogOut className="h-4 w-4 rtl:rotate-180" /> {t.logout}
            </button>
          </Card>
        </div>
      </form>
    </div>
  );
}
