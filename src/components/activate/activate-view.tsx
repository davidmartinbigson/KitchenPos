"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChefHat, KeyRound, LogOut, ShieldAlert, Clock, Sparkles } from "lucide-react";
import { useI18n } from "@/components/providers/language-provider";
import { useToast } from "@/components/providers/toast-provider";
import { LanguageToggle } from "@/components/language-toggle";
import { Button, Card, Input } from "@/components/ui";

type State = "never_activated" | "expired" | "suspended";

export function ActivateView({
  state,
  name,
  shopName,
}: {
  state: State;
  name: string;
  shopName: string;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const A = t.activate;

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headings: Record<State, { title: string; text: string; icon: typeof KeyRound }> = {
    never_activated: { title: A.neverTitle, text: A.neverText, icon: Sparkles },
    expired: { title: A.expiredTitle, text: A.expiredText, icon: Clock },
    suspended: { title: A.suspendedTitle, text: A.suspendedText, icon: ShieldAlert },
  };
  const current = headings[state];
  const Icon = current.icon;

  function keyErrorText(errorCode?: string) {
    switch (errorCode) {
      case "KEY_NOT_FOUND":
        return A.notFound;
      case "KEY_USED":
        return A.used;
      case "KEY_REVOKED":
        return A.revoked;
      case "REQUIRED":
        return t.auth.required;
      default:
        return t.error;
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(keyErrorText(data.error));
        setLoading(false);
        return;
      }
      toast.show(A.success, "success");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t.networkError);
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-5 py-10">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-[26rem] w-[26rem] animate-blob bg-gradient-to-br from-orange-300/50 to-amber-200/40 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-[24rem] w-[24rem] animate-blob bg-gradient-to-br from-rose-300/40 to-pink-200/40 blur-3xl [animation-delay:-7s]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg"
      >
        <div className="mb-6 flex items-center justify-between">
          <span className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/30">
              <ChefHat className="h-5 w-5" />
            </span>
            <span className="text-lg font-black text-slate-900">{t.appName}</span>
          </span>
          <LanguageToggle compact />
        </div>

        <Card className="overflow-hidden p-0">
          <div className="relative bg-gradient-to-br from-slate-950 to-slate-800 p-7 text-white">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 animate-blob rounded-full bg-orange-500/40 blur-2xl" />
            <span className="relative grid h-14 w-14 place-items-center rounded-2xl bg-white/10 animate-float">
              <Icon className="h-7 w-7 text-orange-300" />
            </span>
            <h1 className="relative mt-4 text-2xl font-black tracking-tight">{current.title}</h1>
            <p className="relative mt-2 text-slate-300">{current.text}</p>
            <p className="relative mt-4 text-sm font-semibold text-orange-200">
              {name} · {shopName}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5 p-7">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">{A.keyLabel}</span>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder={A.keyPlaceholder}
                  className="ps-12 text-center font-mono text-lg font-bold tracking-[0.15em]"
                  autoComplete="off"
                  dir="ltr"
                />
              </div>
            </label>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 ring-1 ring-rose-200"
              >
                {error}
              </motion.p>
            )}

            <Button type="submit" size="lg" className="w-full" loading={loading}>
              {loading ? A.activating : A.activate}
            </Button>

            <p className="text-center text-xs text-slate-500">{A.contact}</p>
          </form>
        </Card>

        <button
          onClick={logout}
          className="mx-auto mt-6 flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-white hover:text-rose-600"
        >
          <LogOut className="h-4 w-4 rtl:rotate-180" /> {t.logout}
        </button>
      </motion.div>
    </div>
  );
}
