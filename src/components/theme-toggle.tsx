"use client";

import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import { useI18n } from "@/components/providers/language-provider";

/** Light/dark switcher shown in the app top bar. */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggle } = useTheme();
  const { t } = useI18n();
  const dark = theme === "dark";

  return (
    <button
      onClick={toggle}
      aria-label={dark ? t.theme.light : t.theme.dark}
      title={dark ? t.theme.light : t.theme.dark}
      className={
        "relative grid h-9 place-items-center gap-0 overflow-hidden rounded-full bg-slate-900/5 ring-1 ring-slate-900/10 transition hover:ring-orange-300 dark:bg-white/10 dark:ring-white/15 dark:hover:ring-amber-300/50 " +
        (compact ? "w-14" : "w-16")
      }
    >
      <span className="flex h-full w-full items-center justify-between px-2">
        <Sun className="h-4 w-4 text-amber-500" />
        <Moon className="h-4 w-4 text-slate-500 dark:text-sky-300" />
      </span>
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className={
          "absolute top-1 h-7 w-7 rounded-full bg-gradient-to-br shadow-md " +
          (dark
            ? "end-1 from-sky-400 to-indigo-500"
            : "start-1 from-amber-400 to-orange-500")
        }
      />
    </button>
  );
}
