"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ChefHat, KeyRound, Lock } from "lucide-react";
import { useI18n } from "@/components/providers/language-provider";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, Card, Field, Input, errorText } from "@/components/ui";

export function ResetPasswordForm({ token }: { token: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const A = t.auth;
  const R = t.reset;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError(R.mismatch);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(errorText(data.error, t));
        setLoading(false);
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 2200);
    } catch {
      setError(t.networkError);
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col px-5 py-8 sm:px-10">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 text-white">
            <ChefHat className="h-5 w-5" />
          </span>
          <span className="font-black">{t.appName}</span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle compact />
          <LanguageToggle compact />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto my-auto w-full max-w-md"
      >
        <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{R.title}</h1>
        <p className="mt-2 text-slate-600">{R.subtitle}</p>

        <Card className="mt-8 p-6 sm:p-8">
          {!token ? (
            <div className="space-y-4 text-center">
              <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 ring-1 ring-rose-200">
                {R.invalidLink}
              </p>
              <Link href="/login" className="inline-block font-bold text-orange-600 hover:underline">
                {R.backToLogin}
              </Link>
            </div>
          ) : done ? (
            <div className="space-y-3 py-4 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
              <p className="text-lg font-black text-slate-900">{R.successTitle}</p>
              <p className="text-sm text-slate-500">{R.successBody}</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
              <Field label={R.newPassword}>
                <div className="relative">
                  <Lock className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <Input
                    required
                    type="password"
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="ps-12"
                    autoComplete="new-password"
                    placeholder="••••••••"
                  />
                </div>
              </Field>
              <Field label={R.confirmPassword}>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <Input
                    required
                    type="password"
                    minLength={6}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="ps-12"
                    autoComplete="new-password"
                    placeholder="••••••••"
                  />
                </div>
              </Field>

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
                {loading ? t.saving : R.action}
              </Button>
            </form>
          )}
        </Card>

        <p className="mt-6 text-center text-sm text-slate-600">
          <Link href="/login" className="font-bold text-orange-600 underline-offset-4 hover:underline">
            {R.backToLogin}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
