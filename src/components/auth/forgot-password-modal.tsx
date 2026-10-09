"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { motion } from "framer-motion";
import { Copy, ExternalLink, Mail, MailCheck } from "lucide-react";
import { useI18n } from "@/components/providers/language-provider";
import { Button, Field, Input, Modal } from "@/components/ui";

/**
 * "Forgot password" dialog for the login page.
 * With SMTP configured the reset link is emailed; otherwise the link is
 * shown directly here so the user can reset immediately.
 */
export function ForgotPasswordModal({
  open,
  onClose,
  initialEmail = "",
}: {
  open: boolean;
  onClose: () => void;
  initialEmail?: string;
}) {
  const { t } = useI18n();
  const R = t.reset;

  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ emailed: boolean; resetUrl?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function close() {
    setResult(null);
    setError(null);
    setEmail(initialEmail);
    onClose();
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        emailed?: boolean;
        resetUrl?: string;
      };
      if (!res.ok) {
        setError(data.error === "EMAIL_NOT_FOUND" ? R.emailNotFound : t.error);
        setLoading(false);
        return;
      }
      setResult({ emailed: Boolean(data.emailed), resetUrl: data.resetUrl });
    } catch {
      setError(t.networkError);
    } finally {
      setLoading(false);
    }
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  return (
    <Modal open={open} onClose={close} title={R.forgotTitle}>
      {result ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-emerald-50 px-4 py-4 text-sm ring-1 ring-emerald-200">
            <p className="flex items-center gap-2 font-bold text-emerald-700">
              <MailCheck className="h-5 w-5" />
              {result.emailed ? R.emailSentTitle : R.directTitle}
            </p>
            <p className="mt-1.5 text-emerald-800">
              {result.emailed ? R.emailSentBody : R.directBody}
            </p>
          </div>

          {result.resetUrl && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-2xl bg-slate-50 p-2 ring-1 ring-slate-200">
                <a
                  href={result.resetUrl}
                  className="flex min-w-0 flex-1 items-center gap-1.5 truncate px-2 text-sm font-bold text-orange-600 hover:underline"
                >
                  <ExternalLink className="h-4 w-4 shrink-0" />
                  <span className="truncate" dir="ltr">{result.resetUrl}</span>
                </a>
                <Button size="sm" variant="secondary" onClick={() => copyLink(result.resetUrl!)}>
                  <Copy className="h-3.5 w-3.5" /> {copied ? t.admin.copied : t.admin.copy}
                </Button>
              </div>
              <p className="text-xs text-slate-500">{R.linkValid}</p>
            </div>
          )}

          <Button className="w-full" onClick={close}>
            {t.close}
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <p className="text-sm text-slate-600">{R.forgotBody}</p>
          <Field label={t.auth.email}>
            <div className="relative">
              <Mail className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="ps-12"
                placeholder="you@example.com"
                autoComplete="email"
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
            {R.sendLink}
          </Button>
        </form>
      )}
    </Modal>
  );
}
