"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import { Languages } from "lucide-react";
import { useI18n } from "@/components/providers/language-provider";
import { cn } from "@/components/ui";
import type { Lang } from "@/lib/i18n";

const options: { value: Lang; label: string }[] = [
  { value: "en", label: "English" },
  { value: "ur", label: "اردو" },
];

export function LanguageToggle({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { lang, setLang, t } = useI18n();
  const layoutId = useId();

  return (
    <div
      role="group"
      aria-label={t.language}
      className={cn(
        "relative inline-flex items-center rounded-2xl bg-white/80 p-1 ring-1 ring-slate-200 shadow-sm backdrop-blur",
        className,
      )}
    >
      {!compact && <Languages className="mx-2 h-4 w-4 text-slate-500" aria-hidden />}
      {options.map((option) => {
        const active = lang === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setLang(option.value)}
            aria-pressed={active}
            className={cn(
              "relative z-10 rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors",
              active ? "text-white" : "text-slate-600 hover:text-slate-900",
              option.value === "ur" && "font-urdu text-base leading-none",
            )}
          >
            {active && (
              <motion.span
                layoutId={`lang-pill-${layoutId}`}
                className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 shadow-md shadow-orange-500/30"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
