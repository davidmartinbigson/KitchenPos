"use client";

import { useState } from "react";
import { Building2, ExternalLink, Plus } from "lucide-react";
import { useI18n } from "@/components/providers/language-provider";
import { useBranches } from "@/components/branches/branch-switcher";

/**
 * Settings card for the multi-branch add-on: existing branches + a small
 * create form. The master admin's `branchLimit` decides capacity; when the
 * owner runs out we point them to support instead of failing silently.
 */
export function BranchesSettings() {
  const data = useBranches();
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [copyMenu, setCopyMenu] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");

  if (!data || !data.addonOn) return null;

  async function create() {
    setBusy(true);
    setError("");
    setDone("");
    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, copyMenu }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(
          json.error === "BRANCH_LIMIT"
            ? t.branches.limitFull
            : json.error === "NAME_INVALID"
              ? t.branches.nameLabel
              : "Error",
        );
        return;
      }
      setDone(t.branches.created);
      setName("");
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  async function openBranch(id: number) {
    setBusy(true);
    try {
      await fetch("/api/branch/switch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetId: id }),
      });
      window.location.href = "/dashboard";
    } finally {
      setBusy(false);
    }
  }

  const branches = data.items.filter((b) => !b.isMain);

  return (
    <section className="rounded-[2rem] border border-slate-200/70 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 text-white">
          <Building2 className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-black text-slate-900">{t.branches.title}</p>
          <p className="text-xs font-medium text-slate-500">{t.branches.subtitle}</p>
        </div>
        <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-600 ring-1 ring-orange-200">
          {data.used}/{data.limit} {t.branches.used}
        </span>
      </div>

      {branches.length > 0 && (
        <ul className="mt-5 space-y-2.5">
          {branches.map((b) => (
            <li
              key={b.id}
              className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3"
            >
              <span className="text-lg">🏬</span>
              <span className="min-w-0 flex-1 truncate text-sm font-black text-slate-800">{b.shopName}</span>
              {b.suspended ? (
                <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-black text-rose-700">
                  {t.branches.suspended}
                </span>
              ) : b.online ? (
                <span className="h-2 w-2 rounded-full bg-emerald-500" title="online" />
              ) : null}
              <button
                onClick={() => openBranch(b.id)}
                disabled={busy || b.suspended}
                className="flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-black text-white transition hover:brightness-110 disabled:opacity-40"
              >
                {t.branches.open} <ExternalLink className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {data.used < data.limit ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-4">
          <p className="text-sm font-black text-slate-800">{t.branches.newBranch}</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <label className="flex-1">
              <span className="mb-1 block text-xs font-bold text-slate-500">{t.branches.nameLabel}</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.branches.namePh}
                maxLength={60}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-orange-400"
              />
            </label>
            <label className="flex items-end gap-2 pb-2.5 text-xs font-bold text-slate-600">
              <input
                type="checkbox"
                checked={copyMenu}
                onChange={(e) => setCopyMenu(e.target.checked)}
                className="h-4 w-4 accent-orange-500"
              />
              {t.branches.copyMenu}
            </label>
            <button
              onClick={create}
              disabled={busy || name.trim().length < 2}
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-5 text-sm font-black text-white shadow-lg shadow-orange-500/25 transition hover:brightness-105 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" /> {busy ? t.branches.creating : t.branches.create}
            </button>
          </div>
          {error && <p className="mt-2 text-xs font-bold text-rose-600">{error}</p>}
          {done && <p className="mt-2 text-xs font-bold text-emerald-600">{done}</p>}
        </div>
      ) : (
        <p className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
          ⚠️ {t.branches.limitFull}. {t.branches.hint}
        </p>
      )}
    </section>
  );
}
