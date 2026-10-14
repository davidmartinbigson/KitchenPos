"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, X, UtensilsCrossed, Sparkles, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/components/providers/language-provider";
import {
  botReply,
  chatDict,
  openingMessages,
  type ChatLang,
  type ChatMessage,
  type ChatStep,
} from "@/lib/chatbot";

const typingDelay = () => 500 + Math.random() * 450;

/**
 * Bottom-right floating assistant on the landing page. Guided English-first
 * flow (name → country → city → restaurants) that automatically follows the
 * site's current language. Deterministic V1 brain in src/lib/chatbot.ts.
 */
export function FloatingChat() {
  const { lang, isUrdu } = useI18n();
  const d = chatDict[(lang as ChatLang)] ?? chatDict.en;

  const [open, setOpen] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [step, setStep] = useState<ChatStep>("name");
  const [name, setName] = useState("");
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [showCountryChips, setShowCountryChips] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  // Teaser appears once, shortly after load — draws the eye without blocking.
  useEffect(() => {
    const t = setTimeout(() => setTeaser(true), 1600);
    const t2 = setTimeout(() => setTeaser(false), 12000);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, []);

  // Initialise conversation on first open.
  useEffect(() => {
    if (!open || startedRef.current) return;
    startedRef.current = true;
    setTyping(true);
    const [m1, m2] = openingMessages(lang as ChatLang);
    const t1 = setTimeout(() => setMsgs([m1]), 600);
    const t2 = setTimeout(() => {
      setMsgs([m1, m2]);
      setTyping(false);
    }, 1400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [open, lang]);

  // Language switched mid-chat → keep history; nothing to do (new replies follow new lang).

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, typing, open]);

  const pushMessages = (list: ChatMessage[], afterTyping = true) => {
    if (afterTyping) setTyping(true);
    setTimeout(() => {
      setMsgs((prev) => [...prev, ...list]);
      setTyping(false);
    }, afterTyping ? typingDelay() : 0);
  };

  const searchCity = async (city: string) => {
    try {
      const res = await fetch(`/api/public/restaurants?city=${encodeURIComponent(city)}`);
      const data = (await res.json()) as { restaurants?: ChatMessage["restaurants"] };
      const list = data.restaurants ?? [];
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        if (list.length > 0) {
          // Show the matched city's REAL spelling (e.g. user typed "Kara" → heading says "Karachi").
          const counts = new Map<string, number>();
          for (const r of list) counts.set(r.city, (counts.get(r.city) ?? 0) + 1);
          const displayCity = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
          setMsgs((prev) => [
            ...prev,
            { from: "bot", text: d.foundHeading(displayCity, list.length), restaurants: list },
          ]);
        } else {
          setMsgs((prev) => [...prev, { from: "bot", text: d.noResults(city) }]);
        }
      }, typingDelay());
    } catch {
      pushMessages([{ from: "bot", text: d.noResults(city) }]);
    }
  };

  const send = (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || typing) return;
    setInput("");
    setShowCountryChips(false);
    setMsgs((prev) => [...prev, { from: "user", text }]);

    const out = botReply(lang as ChatLang, step, text, name);
    if (step === "name") {
      const clean = text.replace(/[^\p{L}\p{N}\s.'-]/gu, "").trim().slice(0, 24);
      setName(clean || "friend");
      setShowCountryChips(true);
    }
    setStep(out.next);
    pushMessages(out.messages);
    if (out.wantCity) {
      // The "searching…" bubble is already queued; run search after the beat.
      setTimeout(() => void searchCity(out.wantCity as string), typingDelay() + 250);
    }
  };

  const dir = isUrdu ? "rtl" : "ltr";
  const chips = showCountryChips ? d.countryChips : d.footerChips;

  return (
    <div className="fixed bottom-5 z-[70] print:hidden" style={{ insetInlineEnd: "1.25rem" }} dir={dir}>
      {/* Teaser bubble */}
      <AnimatePresence>
        {teaser && !open && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            onClick={() => setOpen(true)}
            className="absolute bottom-[4.5rem] end-0 mb-1 flex w-max max-w-[240px] cursor-pointer items-center gap-2 rounded-2xl rounded-ee-md bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-xl shadow-orange-900/10 ring-1 ring-slate-200"
          >
            <Sparkles className="h-4 w-4 shrink-0 text-orange-500" />
            {d.teaser}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-[4.6rem] end-0 mb-1 flex h-[520px] w-[min(92vw,380px)] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-900/20 ring-1 ring-slate-200"
          >
            {/* Header */}
            <div className="relative flex items-center gap-3 bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 px-4 py-3.5 text-white">
              <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white/95 shadow-inner ring-2 ring-white/60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icon.png" alt="Kitchen POS" className="h-9 w-9 object-contain" />
                <span className="absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black">{d.title}</p>
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-white/85">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> {d.onlineNow} · {d.subtitle}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="grid h-8 w-8 place-items-center rounded-xl bg-white/15 transition hover:bg-white/30"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollerRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50/80 px-4 py-4">
              {msgs.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={m.from === "bot" ? "flex items-end gap-2" : "flex justify-end"}
                >
                  {m.from === "bot" && (
                    <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-orange-100 to-rose-100 ring-1 ring-orange-200/60">
                      <Bot className="h-4 w-4 text-orange-600" />
                    </span>
                  )}
                  <div
                    className={
                      m.from === "bot"
                        ? "max-w-[82%] rounded-2xl rounded-ee-md bg-white px-3.5 py-2.5 text-sm font-medium leading-relaxed text-slate-700 shadow-sm ring-1 ring-slate-200/70"
                        : "max-w-[82%] rounded-2xl rounded-es-md bg-gradient-to-br from-orange-500 to-rose-500 px-3.5 py-2.5 text-sm font-semibold leading-relaxed text-white shadow-md shadow-orange-500/20"
                    }
                  >
                    {m.text}
                    {m.restaurants && m.restaurants.length > 0 && (
                      <div className="mt-2.5 space-y-1.5">
                        {m.restaurants.map((r) => (
                          <a
                            key={r.id}
                            href={`/menu/${r.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-orange-50 to-rose-50 px-3 py-2 text-start ring-1 ring-orange-200/70 transition hover:from-orange-100 hover:to-rose-100 hover:ring-orange-300"
                          >
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-base shadow-sm">🍽️</span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-black text-slate-800">{r.name}</span>
                              <span className="block text-[11px] font-semibold text-orange-600">📍 {r.city} · {d.viewMenu}</span>
                            </span>
                            <ArrowUpRight className="h-4 w-4 shrink-0 text-orange-500" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {typing && (
                <div className="flex items-end gap-2">
                  <span className="grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-orange-100 to-rose-100 ring-1 ring-orange-200/60">
                    <Bot className="h-4 w-4 text-orange-600" />
                  </span>
                  <div className="rounded-2xl rounded-ee-md bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/70">
                    <span className="flex gap-1.5">
                      {[0, 1, 2].map((n) => (
                        <span
                          key={n}
                          className="h-2 w-2 animate-bounce rounded-full bg-orange-400"
                          style={{ animationDelay: `${n * 0.15}s` }}
                        />
                      ))}
                    </span>
                  </div>
                </div>
              )}

              {/* Quick replies */}
              {!typing && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {chips.map((c) => (
                    <button
                      key={c}
                      onClick={() => send(c)}
                      className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-orange-600 ring-1 ring-orange-200 transition hover:bg-orange-50 hover:ring-orange-300"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Trial CTA strip (after trial intent) */}
            {msgs.some((m) => m.text === chatDict[(lang as ChatLang)]?.trialReply) && (
              <div className="border-t border-slate-100 bg-white px-4 py-2.5">
                <Link
                  href="/signup"
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 py-2.5 text-sm font-black text-white shadow-md shadow-orange-500/25 transition hover:shadow-lg hover:brightness-105"
                >
                  <UtensilsCrossed className="h-4 w-4" />
                  {d.trial} →
                </Link>
              </div>
            )}

            {/* Input */}
            <div className="flex items-center gap-2 border-t border-slate-100 bg-white p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder={d.inputPlaceholder}
                maxLength={200}
                className="h-11 flex-1 rounded-xl bg-slate-100 px-4 text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none ring-inset transition focus:bg-white focus:ring-2 focus:ring-orange-300"
              />
              <button
                onClick={() => send()}
                disabled={!input.trim()}
                aria-label="Send"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-md shadow-orange-500/25 transition hover:brightness-105 disabled:opacity-40"
              >
                <Send className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen((o) => !o)}
        aria-label={d.title}
        className="relative grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-orange-500 via-rose-500 to-amber-500 text-white shadow-xl shadow-orange-500/40 transition hover:shadow-2xl"
      >
        <span className="absolute inset-0 animate-ping rounded-full bg-orange-400/40 [animation-duration:2.5s]" />
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="h-7 w-7" />
            </motion.span>
          ) : (
            <motion.span key="logo" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-white/95 shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon.png" alt="" className="h-9 w-9 object-contain" />
            </motion.span>
          )}
        </AnimatePresence>
        {!open && (
          <span className="absolute -top-0.5 -end-0.5 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-[10px] font-black ring-2 ring-white">
            1
          </span>
        )}
      </motion.button>
    </div>
  );
}
