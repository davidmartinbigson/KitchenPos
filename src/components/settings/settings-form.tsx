"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Globe2, LogOut, Receipt, Save, Store, UserRound, Mail, Coins } from "lucide-react";
import { useI18n } from "@/components/providers/language-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Button, Card, Field, Input, Select, cn, errorText } from "@/components/ui";
import type { Lang } from "@/lib/i18n";
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
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopName, country, currency, language, dailyOrderReset: dailyCounter }),
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
