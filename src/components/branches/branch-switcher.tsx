"use client";

import { useEffect, useState } from "react";
import { Building2, ChevronsUpDown } from "lucide-react";
import { useI18n } from "@/components/providers/language-provider";

type BranchItem = {
  id: number;
  shopName: string;
  suspended: boolean;
  online: boolean;
  isMain: boolean;
};

type BranchList = {
  items: BranchItem[];
  currentId: number;
  limit: number;
  used: number;
  canCreate: boolean;
  addonOn: boolean;
};

export function useBranches(): BranchList | null {
  const [data, setData] = useState<BranchList | null>(null);
  useEffect(() => {
    fetch("/api/branches")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setData(j))
      .catch(() => {});
  }, []);
  return data;
}

/**
 * Owner branch hopper. Lets the owner jump between the main store and its
 * branches — the whole app re-renders for the selected store (it IS a full store).
 * Hidden unless the multi-branch add-on is on for the shop.
 */
export function BranchSwitcher({ dropdownClass = "" }: { dropdownClass?: string }) {
  const data = useBranches();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!data || !data.addonOn) return null;

  async function switchTo(targetId: number) {
    if (targetId === data!.currentId) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/branch/switch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetId }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error === "BRANCH_SUSPENDED" ? `${t.branches.suspended} ⛔` : "⚠️");
        return;
      }
      window.location.href = "/dashboard";
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-1 pb-2">
      <div
        className={`flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm ${dropdownClass}`}
      >
        <Building2 className="h-4 w-4 shrink-0 text-orange-500" />
        <label className="relative flex-1">
          <span className="sr-only">{t.branches.title}</span>
          <select
            disabled={busy}
            value={data.currentId}
            onChange={(e) => switchTo(Number(e.target.value))}
            className="w-full appearance-none bg-transparent pe-5 text-sm font-bold text-slate-800 outline-none"
          >
            {data.items.map((b) => (
              <option key={b.id} value={b.id} disabled={b.suspended}>
                {b.isMain ? "🏠 " : "🏬 "}
                {b.shopName}
                {b.isMain ? ` · ${t.branches.mainTag}` : ""}
                {b.suspended ? ` · ${t.branches.suspended}` : ""}
              </option>
            ))}
          </select>
          <ChevronsUpDown className="pointer-events-none absolute end-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </label>
        <span className="shrink-0 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-black text-orange-600">
          {data.used}/{data.limit}
        </span>
      </div>
      {error && <p className="mt-1 px-1 text-[11px] font-bold text-red-600">{error}</p>}
    </div>
  );
}
