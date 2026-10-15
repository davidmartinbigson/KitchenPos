"use client";

import Link from "next/link";
import { CookingPot, Settings } from "lucide-react";
import { useI18n } from "@/components/providers/language-provider";

/** Shown when the Kitchen display add-on is off for this shop. */
export function KitchenOffScreen({ isOwner, shopName }: { isOwner: boolean; shopName: string }) {
  const { t } = useI18n();
  const k = t.kitchen;
  return (
    <div className="grid min-h-dvh place-items-center bg-gradient-to-br from-orange-50 via-white to-rose-50 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl shadow-orange-900/10 ring-1 ring-slate-200">
        <span className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/30">
          <CookingPot className="h-8 w-8" />
        </span>
        <p className="text-xs font-black uppercase tracking-widest text-orange-500">{shopName}</p>
        <h1 className="mt-1 text-xl font-black text-slate-900">{k.offTitle}</h1>
        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
          {isOwner ? k.offOwner : k.offStaff}
        </p>
        {isOwner && (
          <Link
            href="/settings"
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 px-5 py-3 text-sm font-black text-white shadow-md shadow-orange-500/25 transition hover:shadow-lg hover:brightness-105"
          >
            <Settings className="h-4 w-4" /> {k.offBtn} →
          </Link>
        )}
      </div>
    </div>
  );
}
