"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ChefHat, Globe2, Lock, Mail, Store, UserRound, CheckCircle2, UsersRound } from "lucide-react";
import { useI18n } from "@/components/providers/language-provider";
import { useToast } from "@/components/providers/toast-provider";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { ForgotPasswordModal } from "@/components/auth/forgot-password-modal";
import { Button, Card, Field, Input, Select, errorText } from "@/components/ui";
import { COUNTRIES, currencyForCountry, detectCountryFromLocale } from "@/lib/countries";
import { useEffect } from "react";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const { t, setLang } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", shopName: "" });
  const [country, setCountry] = useState("PK");
  const [forgotOpen, setForgotOpen] = useState(false);

  // Pre-select the visitor's country from the browser locale (PK → Rs, US → $, GB → £, ...).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads browser locale on mount
    setCountry(detectCountryFromLocale());
  }, []);

  const isSignup = mode === "signup";
  const A = t.auth;

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(isSignup ? "/api/auth/signup" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isSignup
            ? { ...form, country }
            : { email: form.email, password: form.password },
        ),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        user?: { language: string };
        staff?: boolean;
        role?: string;
      };
      if (!res.ok) {
        setError(errorText(data.error, t));
        setLoading(false);
        return;
      }
      if (data.user?.language === "ur" || data.user?.language === "en") {
        setLang(data.user.language);
      }
      toast.show(isSignup ? A.signupTitle : A.loginTitle, "success");
      if (data.staff) {
        router.push(data.role === "chef" ? "/kitchen" : "/pos");
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    } catch {
      setError(t.networkError);
      setLoading(false);
    }
  }

  const perks = [t.landing.f1Title, t.landing.f2Title, t.landing.f4Title];

  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      {/* Decorative panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-orange-500 via-rose-500 to-amber-500 p-12 text-white lg:flex lg:flex-col lg:justify-between animate-gradient bg-[length:200%_200%]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 top-10 h-72 w-72 animate-blob rounded-full bg-white/20 blur-2xl" />
          <div className="absolute bottom-0 right-0 h-96 w-96 animate-blob rounded-full bg-amber-300/30 blur-3xl [animation-delay:-7s]" />
        </div>
        <Link href="/" className="relative flex items-center gap-2.5">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/20 backdrop-blur">
            <ChefHat className="h-6 w-6" />
          </span>
          <span className="text-xl font-black">{t.appName}</span>
        </Link>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <p className="text-4xl font-black leading-tight xl:text-5xl">{t.tagline}</p>
          <ul className="mt-8 space-y-3">
            {perks.map((p, i) => (
              <motion.li
                key={p}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.12 }}
                className="flex items-center gap-2.5 text-lg font-semibold text-white/95"
              >
                <CheckCircle2 className="h-5 w-5" /> {p}
              </motion.li>
            ))}
          </ul>
        </motion.div>
        <p className="relative text-sm text-white/80">{t.landing.footer}</p>
      </div>

      {/* Form */}
      <div className="flex flex-col px-5 py-8 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 text-white">
              <ChefHat className="h-5 w-5" />
            </span>
            <span className="font-black">{t.appName}</span>
          </Link>
          <span className="flex items-center gap-3 lg:ms-auto">
            <ThemeToggle compact />
            <LanguageToggle compact />
          </span>
        </div>

        <div className="my-auto w-full py-10">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto w-full max-w-md"
          >
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              {isSignup ? A.signupTitle : A.loginTitle}
            </h1>
            <p className="mt-2 text-slate-600">{isSignup ? A.signupSubtitle : A.loginSubtitle}</p>

            <Card className="mt-8 p-6 sm:p-8">
              <form onSubmit={onSubmit} className="space-y-5">
                {isSignup && (
                  <>
                    <Field label={A.name}>
                      <div className="relative">
                        <UserRound className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <Input
                          required
                          value={form.name}
                          onChange={update("name")}
                          className="ps-12"
                          autoComplete="name"
                        />
                      </div>
                    </Field>
                    <Field label={A.shopName}>
                      <div className="relative">
                        <Store className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <Input
                          required
                          value={form.shopName}
                          onChange={update("shopName")}
                          className="ps-12"
                          placeholder="e.g. Karachi Biryani House"
                        />
                      </div>
                    </Field>
                    <Field label={A.country} hint={`${A.countryHint} (${currencyForCountry(country)})`}>
                      <div className="relative">
                        <Globe2 className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <Select
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="ps-12"
                        >
                          {COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.name} — {c.currencySymbol} {c.currencyCode}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </Field>
                  </>
                )}
                <Field label={A.email}>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <Input
                      required
                      type="email"
                      value={form.email}
                      onChange={update("email")}
                      className="ps-12"
                      autoComplete="email"
                      placeholder="you@example.com"
                    />
                  </div>
                </Field>
                <Field label={A.password}>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <Input
                      required
                      type="password"
                      minLength={6}
                      value={form.password}
                      onChange={update("password")}
                      className="ps-12"
                      autoComplete={isSignup ? "new-password" : "current-password"}
                      placeholder="••••••••"
                    />
                  </div>
                </Field>

                {!isSignup && (
                  <div className="-mt-2 text-end">
                    <button
                      type="button"
                      onClick={() => setForgotOpen(true)}
                      className="text-sm font-bold text-orange-600 underline-offset-4 hover:underline"
                    >
                      {A.forgotPassword}
                    </button>
                  </div>
                )}

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 ring-1 ring-rose-200"
                  >
                    {error}
                  </motion.p>
                )}

                <Button type="submit" size="lg" loading={loading} className="w-full">
                  {loading ? (isSignup ? A.creating : A.loggingIn) : isSignup ? A.signupAction : A.loginAction}
                  {!loading && <ArrowRight className="h-5 w-5 rtl:rotate-180" />}
                </Button>
              </form>
            </Card>

            <p className="mt-6 text-center text-sm text-slate-600">
              {isSignup ? A.haveAccount : A.noAccount}{" "}
              <Link
                href={isSignup ? "/login" : "/signup"}
                className="font-bold text-orange-600 underline-offset-4 hover:underline"
              >
                {isSignup ? A.loginAction : A.signupAction}
              </Link>
            </p>
            {!isSignup && (
              <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-slate-500">
                <UsersRound className="h-4 w-4 text-orange-400" />
                {A.staffHint}
              </p>
            )}
          </motion.div>
        </div>
      </div>

      <ForgotPasswordModal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        initialEmail={form.email}
      />
    </div>
  );
}
