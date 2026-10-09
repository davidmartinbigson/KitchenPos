"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  Ban,
  Copy,
  CalendarPlus,
  Crown,
  KeyRound,
  LogOut,
  Plus,
  Search,
  ShieldX,
  Store,
  Trash2,
  Users,
  Play,
  ListPlus,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useI18n } from "@/components/providers/language-provider";
import { useToast } from "@/components/providers/toast-provider";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { AnimatedNumber } from "@/components/animated-number";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Select, Skeleton, cn } from "@/components/ui";
import { formatDate, formatNumber } from "@/lib/format";

type Customer = {
  id: number;
  name: string;
  email: string;
  shopName: string;
  currency: string;
  country: string;
  suspended: boolean;
  accessExpiresAt: string | null;
  itemLimit: number;
  lastSeenAt: string | null;
  online: boolean;
  createdAt: string;
};

type Summary = { customers: number; active: number; online: number; offline: number; orders: number };

type LicenseKey = {
  id: number;
  code: string;
  plan: string;
  durationDays: number;
  note: string;
  revoked: boolean;
  redeemedAt: string | null;
  createdAt: string;
  redeemedByEmail: string | null;
  redeemedByShop: string | null;
};

type CustomerStatus = "active" | "expired" | "suspended" | "pending";

function statusOf(c: Customer): CustomerStatus {
  if (c.suspended) return "suspended";
  if (!c.accessExpiresAt) return "pending";
  return new Date(c.accessExpiresAt).getTime() > Date.now() ? "active" : "expired";
}

export function AdminPanel({ adminName, adminEmail }: { adminName: string; adminEmail: string }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const A = t.admin;

  const [tab, setTab] = useState<"customers" | "keys">("customers");
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [keys, setKeys] = useState<LicenseKey[] | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CustomerStatus>("all");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [extendTarget, setExtendTarget] = useState<Customer | null>(null);
  const [extendDays, setExtendDays] = useState("30");
  const [genOpen, setGenOpen] = useState(false);
  const [genPlan, setGenPlan] = useState("monthly");
  const [genDays, setGenDays] = useState("30");
  const [genQty, setGenQty] = useState("1");
  const [genNote, setGenNote] = useState("");
  const [generating, setGenerating] = useState(false);
  const [newKeys, setNewKeys] = useState<LicenseKey[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [limitTarget, setLimitTarget] = useState<Customer | null>(null);
  const [limitValue, setLimitValue] = useState("500");

  const loadCustomers = useCallback(() => {
    fetch("/api/admin/customers")
      .then((r) => r.json())
      .then((data: { customers: Customer[]; summary: Summary }) => {
        setCustomers(data.customers ?? []);
        setSummary(data.summary ?? null);
      })
      .catch(() => setCustomers([]));
  }, []);

  const loadKeys = useCallback(() => {
    fetch("/api/admin/keys")
      .then((r) => r.json())
      .then((data: { keys: LicenseKey[] }) => setKeys(data.keys ?? []))
      .catch(() => setKeys([]));
  }, []);

  useEffect(() => {
    loadCustomers();
    loadKeys();
    // Keep live Online/Offline presence fresh.
    const timer = setInterval(loadCustomers, 15_000);
    return () => clearInterval(timer);
  }, [loadCustomers, loadKeys]);

  const filtered = useMemo(() => {
    if (!customers) return null;
    const q = query.trim().toLowerCase();
    return customers.filter((c) => {
      const matchQ =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.shopName.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || statusOf(c) === statusFilter;
      return matchQ && matchStatus;
    });
  }, [customers, query, statusFilter]);

  async function customerAction(id: number, body: Record<string, unknown>) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        toast.show(t.error, "error");
        return;
      }
      toast.show(A.updated, "success");
      loadCustomers();
    } catch {
      toast.show(t.networkError, "error");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteCustomer() {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    const res = await fetch(`/api/admin/customers/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.show(A.updated, "success");
      loadCustomers();
      loadKeys();
    } else {
      toast.show(t.error, "error");
    }
    setBusyId(null);
    setDeleteTarget(null);
  }

  async function generateKeys() {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: genPlan,
          durationDays: Number(genDays),
          quantity: Number(genQty),
          note: genNote,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { keys?: LicenseKey[]; error?: string };
      if (!res.ok || !data.keys) {
        toast.show(t.error, "error");
        return;
      }
      setNewKeys(data.keys);
      toast.show(`${data.keys.length} ${A.generated}`, "success");
      loadKeys();
      setTab("keys");
    } catch {
      toast.show(t.networkError, "error");
    } finally {
      setGenerating(false);
    }
  }

  async function toggleRevoke(key: LicenseKey) {
    const res = await fetch(`/api/admin/keys/${key.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revoked: !key.revoked }),
    });
    if (res.ok) {
      toast.show(A.updated, "success");
      loadKeys();
    } else toast.show(t.error, "error");
  }

  async function deleteKey(key: LicenseKey) {
    const res = await fetch(`/api/admin/keys/${key.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.show(A.updated, "success");
      loadKeys();
    } else toast.show(t.error, "error");
  }

  async function copy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      toast.show(A.copied, "success");
      setTimeout(() => setCopied(null), 1800);
    } catch {
      toast.show(t.error, "error");
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const statusTone: Record<CustomerStatus, "green" | "red" | "orange" | "slate"> = {
    active: "green",
    expired: "orange",
    suspended: "red",
    pending: "slate",
  };
  const statusLabel: Record<CustomerStatus, string> = {
    active: A.active,
    expired: A.expired,
    suspended: A.suspended,
    pending: A.pending,
  };

  const cards = [
    { label: A.totalCustomers, value: summary?.customers ?? 0, icon: Users, gradient: "from-orange-500 to-rose-500", fmt: (n: number) => formatNumber(Math.round(n), lang) },
    { label: A.activeCustomers, value: summary?.active ?? 0, icon: BadgeCheck, gradient: "from-emerald-500 to-teal-500", fmt: (n: number) => formatNumber(Math.round(n), lang) },
    { label: A.onlineNow, value: summary?.online ?? 0, icon: Wifi, gradient: "from-sky-500 to-indigo-500", fmt: (n: number) => formatNumber(Math.round(n), lang) },
    { label: A.offlineNow, value: summary?.offline ?? 0, icon: WifiOff, gradient: "from-slate-500 to-slate-700", fmt: (n: number) => formatNumber(Math.round(n), lang) },
  ];

  return (
    <div className="relative min-h-screen px-4 py-6 sm:px-8">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-96 w-96 animate-blob bg-gradient-to-br from-amber-300/40 to-orange-200/40 blur-3xl" />
        <div className="absolute -right-24 bottom-10 h-96 w-96 animate-blob bg-gradient-to-br from-violet-300/30 to-rose-200/40 blur-3xl [animation-delay:-8s]" />
      </div>

      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-2xl sm:p-8"
        >
          <div className="pointer-events-none absolute -right-14 -top-14 h-64 w-64 animate-blob rounded-full bg-amber-500/30 blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-5">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-black uppercase tracking-widest text-amber-300">
                <Crown className="h-3.5 w-3.5" /> {A.badge}
              </span>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{A.title}</h1>
              <p className="mt-2 text-slate-300">{A.subtitle}</p>
              <p className="mt-2 text-xs font-semibold text-slate-400">{A.presenceNote}</p>
              <p className="mt-3 text-sm font-semibold text-amber-200">
                {adminName} · {adminEmail}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ThemeToggle compact />
              <LanguageToggle compact />
              <Button onClick={() => setGenOpen(true)}>
                <Plus className="h-4 w-4" /> {A.generate}
              </Button>
              <button
                onClick={logout}
                className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-semibold transition hover:bg-rose-500/80"
              >
                <LogOut className="h-4 w-4 rtl:rotate-180" /> {t.logout}
              </button>
            </div>
          </div>
        </motion.header>

        {/* Summary cards */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div key={card.label} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                <Card hover className="p-5">
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-semibold text-slate-500">{card.label}</p>
                    <span className={cn("grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg", card.gradient)}>
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                  <p className="mt-3 text-2xl font-black tracking-tight text-slate-900">
                    {summary ? <AnimatedNumber value={card.value} format={card.fmt} /> : <Skeleton className="h-8 w-28" />}
                  </p>
                </Card>
              </motion.div>
            );
          })}
        </section>

        {/* Tabs */}
        <div className="inline-flex rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-200">
          {([
            { key: "customers", label: A.customers, icon: Store },
            { key: "keys", label: A.keys, icon: KeyRound },
          ] as const).map((item) => {
            const Icon = item.icon;
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={cn(
                  "relative flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition",
                  active ? "text-white" : "text-slate-600 hover:text-slate-900",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="admin-tab"
                    className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 shadow-md"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon className="h-4 w-4" /> {item.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {tab === "customers" ? (
            <motion.section
              key="customers"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={A.searchCustomers} className="ps-12" />
                </div>
                <div className="flex gap-2 overflow-x-auto">
                  {(["all", "active", "expired", "suspended", "pending"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={cn(
                        "shrink-0 rounded-2xl px-4 py-2 text-sm font-semibold transition",
                        statusFilter === s ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200",
                      )}
                    >
                      {s === "all" ? A.allStatuses : statusLabel[s]}
                    </button>
                  ))}
                </div>
              </div>

              {!filtered ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <EmptyState icon={<Users className="h-8 w-8" />} title={A.noCustomers} />
              ) : (
                <div className="grid gap-4">
                  {filtered.map((c, i) => {
                    const status = statusOf(c);
                    return (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.04, 0.3) }}
                      >
                        <Card className="p-5">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="flex min-w-0 items-start gap-3">
                              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-lg font-black text-white">
                                {c.shopName.charAt(0).toUpperCase()}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-lg font-black text-slate-900">{c.shopName}</p>
                                <p className="truncate text-sm text-slate-600">
                                  {c.name} · {c.email}
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <Badge tone={statusTone[status]}>{statusLabel[status]}</Badge>
                                  {c.accessExpiresAt && (
                                    <span className="text-xs font-semibold text-slate-500">
                                      {A.expires}: {formatDate(c.accessExpiresAt, lang)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-sm">
                              {/* Privacy: sales data is hidden; only live presence is shown. */}
                              {c.online ? (
                                <span className="flex items-center gap-2 rounded-full bg-emerald-100 px-3.5 py-1.5 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">
                                  <span className="relative flex h-2.5 w-2.5">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                  </span>
                                  {A.online}
                                </span>
                              ) : (
                                <span className="flex items-center gap-2 rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-black text-slate-500 ring-1 ring-slate-200">
                                  <WifiOff className="h-3.5 w-3.5" />
                                  {A.offline}
                                </span>
                              )}
                              <button
                                onClick={() => {
                                  setLimitTarget(c);
                                  setLimitValue(String(c.itemLimit));
                                }}
                                className="flex items-center gap-2 rounded-full bg-indigo-50 px-3.5 py-1.5 text-xs font-black text-indigo-700 ring-1 ring-indigo-200 transition hover:bg-indigo-100"
                                title={A.setLimit}
                              >
                                <ListPlus className="h-3.5 w-3.5" />
                                {A.itemLimit}: {formatNumber(c.itemLimit, lang)}
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={busyId === c.id}
                              onClick={() => {
                                setExtendTarget(c);
                                setExtendDays("30");
                              }}
                            >
                              <CalendarPlus className="h-4 w-4" /> {A.extend}
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={busyId === c.id}
                              onClick={() => {
                                setLimitTarget(c);
                                setLimitValue(String(c.itemLimit));
                              }}
                            >
                              <ListPlus className="h-4 w-4" /> {A.setLimit}
                            </Button>
                            {c.suspended ? (
                              <Button size="sm" variant="success" disabled={busyId === c.id} onClick={() => customerAction(c.id, { action: "resume" })}>
                                <Play className="h-4 w-4" /> {A.resume}
                              </Button>
                            ) : (
                              <Button size="sm" variant="secondary" disabled={busyId === c.id} onClick={() => customerAction(c.id, { action: "suspend" })}>
                                <Ban className="h-4 w-4" /> {A.suspend}
                              </Button>
                            )}
                            <Button size="sm" variant="danger" disabled={busyId === c.id} onClick={() => customerAction(c.id, { action: "revokeAccess" })}>
                              <ShieldX className="h-4 w-4" /> {A.cutAccess}
                            </Button>
                            <Button size="sm" variant="ghost" className="text-rose-600" disabled={busyId === c.id} onClick={() => setDeleteTarget(c)}>
                              <Trash2 className="h-4 w-4" /> {A.deleteCustomer}
                            </Button>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.section>
          ) : (
            <motion.section
              key="keys"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {newKeys.length > 0 && (
                <Card className="border-2 border-emerald-200 bg-emerald-50/70 p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="font-black text-emerald-800">
                      {newKeys.length} {A.generated}
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => copy(newKeys.map((k) => k.code).join("\n"), "all")}>
                        <Copy className="h-4 w-4" /> {copied === "all" ? A.copied : A.copyAll}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setNewKeys([])}>
                        {t.close}
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {newKeys.map((k) => (
                      <button
                        key={k.id}
                        onClick={() => copy(k.code, String(k.id))}
                        className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 font-mono text-sm font-bold text-slate-800 ring-1 ring-emerald-200 transition hover:ring-emerald-400"
                        dir="ltr"
                      >
                        {k.code}
                        <Copy className={cn("h-4 w-4", copied === String(k.id) ? "text-emerald-600" : "text-slate-400")} />
                      </button>
                    ))}
                  </div>
                </Card>
              )}

              {!keys ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : keys.length === 0 ? (
                <EmptyState
                  icon={<KeyRound className="h-8 w-8" />}
                  title={A.noKeys}
                  action={<Button onClick={() => setGenOpen(true)}>{A.generate}</Button>}
                />
              ) : (
                <Card className="overflow-hidden p-0">
                  <div className="scroll-thin overflow-x-auto">
                    <table className="w-full text-start text-sm">
                      <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                        <tr>
                          <th className="px-4 py-3 text-start">{A.key}</th>
                          <th className="px-4 py-3 text-start">{A.plan}</th>
                          <th className="px-4 py-3 text-start">{A.keyStatus}</th>
                          <th className="px-4 py-3 text-start">{A.redeemedBy}</th>
                          <th className="px-4 py-3 text-end">{A.actions}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {keys.map((k) => {
                          const used = Boolean(k.redeemedAt);
                          return (
                            <tr key={k.id} className="transition hover:bg-slate-50">
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => copy(k.code, String(k.id))}
                                  className="flex items-center gap-2 font-mono font-bold text-slate-900"
                                  dir="ltr"
                                >
                                  {k.code}
                                  <Copy className={cn("h-3.5 w-3.5", copied === String(k.id) ? "text-emerald-600" : "text-slate-400")} />
                                </button>
                                {k.note && <p className="mt-0.5 text-xs text-slate-500">{k.note}</p>}
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-semibold capitalize text-slate-700">{k.plan}</span>
                                <p className="text-xs text-slate-500">
                                  {formatNumber(k.durationDays, lang)} {A.daysUnit}
                                </p>
                              </td>
                              <td className="px-4 py-3">
                                <Badge tone={k.revoked ? "red" : used ? "slate" : "green"}>
                                  {k.revoked ? A.revoked : used ? A.used : A.unused}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                {k.redeemedByEmail ? (
                                  <div className="min-w-0">
                                    <p className="truncate font-semibold text-slate-800">{k.redeemedByShop}</p>
                                    <p className="truncate text-xs text-slate-500">{k.redeemedByEmail}</p>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex justify-end gap-2">
                                  <Button size="sm" variant="secondary" onClick={() => toggleRevoke(k)}>
                                    {k.revoked ? A.unrevoke : A.revoke}
                                  </Button>
                                  {!used && (
                                    <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => deleteKey(k)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      {/* Generate keys modal */}
      <Modal
        open={genOpen}
        onClose={() => setGenOpen(false)}
        title={A.generateTitle}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setGenOpen(false)}>
              {t.cancel}
            </Button>
            <Button
              loading={generating}
              onClick={async () => {
                await generateKeys();
                setGenOpen(false);
              }}
            >
              <KeyRound className="h-4 w-4" /> {A.generate}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <Field label={A.plan}>
            <Select value={genPlan} onChange={(e) => setGenPlan(e.target.value)}>
              <option value="monthly">{A.monthly}</option>
              <option value="quarterly">{A.quarterly}</option>
              <option value="half-yearly">{A.halfYearly}</option>
              <option value="yearly">{A.yearly}</option>
              <option value="lifetime">{A.lifetime}</option>
              <option value="custom">{A.custom}</option>
            </Select>
          </Field>
          {genPlan === "custom" && (
            <Field label={A.days}>
              <Input type="number" min={1} max={36500} value={genDays} onChange={(e) => setGenDays(e.target.value)} />
            </Field>
          )}
          <Field label={A.quantity}>
            <Input type="number" min={1} max={100} value={genQty} onChange={(e) => setGenQty(e.target.value)} />
          </Field>
          <Field label={A.note}>
            <Input value={genNote} onChange={(e) => setGenNote(e.target.value)} placeholder={A.notePlaceholder} maxLength={200} />
          </Field>
        </div>
      </Modal>

      {/* Extend modal */}
      <Modal
        open={Boolean(extendTarget)}
        onClose={() => setExtendTarget(null)}
        title={A.extend}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setExtendTarget(null)}>
              {t.cancel}
            </Button>
            <Button
              onClick={async () => {
                if (!extendTarget) return;
                await customerAction(extendTarget.id, { action: "extend", days: Number(extendDays) });
                setExtendTarget(null);
              }}
            >
              <CalendarPlus className="h-4 w-4" /> {A.extend}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {extendTarget && (
            <p className="font-semibold text-slate-700">
              {extendTarget.shopName} · {extendTarget.email}
            </p>
          )}
          <Field label={A.extendDays}>
            <Input type="number" value={extendDays} onChange={(e) => setExtendDays(e.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-2">
            {[30, 90, 182, 365].map((d) => (
              <button
                key={d}
                onClick={() => setExtendDays(String(d))}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-bold ring-1 transition",
                  extendDays === String(d) ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200",
                )}
              >
                +{d} {A.daysUnit}
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Item limit modal */}
      <Modal
        open={Boolean(limitTarget)}
        onClose={() => setLimitTarget(null)}
        title={A.limitTitle}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setLimitTarget(null)}>
              {t.cancel}
            </Button>
            <Button
              onClick={async () => {
                if (!limitTarget) return;
                await customerAction(limitTarget.id, {
                  action: "setItemLimit",
                  value: Number(limitValue),
                });
                setLimitTarget(null);
              }}
            >
              <ListPlus className="h-4 w-4" /> {A.setLimit}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {limitTarget && (
            <p className="font-semibold text-slate-700">
              {limitTarget.shopName} · {limitTarget.email}
            </p>
          )}
          <p className="text-sm text-slate-500">{A.limitHint}</p>
          <Field label={A.itemLimit}>
            <Input
              type="number"
              min={1}
              max={100000}
              value={limitValue}
              onChange={(e) => setLimitValue(e.target.value)}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            {[500, 1000, 2000, 5000].map((n) => (
              <button
                key={n}
                onClick={() => setLimitValue(String(n))}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-bold ring-1 transition",
                  limitValue === String(n) ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200",
                )}
              >
                {formatNumber(n, lang)}
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Delete customer */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={A.deleteCustomer}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              {t.cancel}
            </Button>
            <Button className="!bg-rose-600 !text-white" onClick={deleteCustomer}>
              <Trash2 className="h-4 w-4" /> {t.delete}
            </Button>
          </div>
        }
      >
        <p className="text-slate-600">
          {A.deleteConfirm}
          {deleteTarget && <span className="mt-2 block font-bold text-slate-900">{deleteTarget.shopName}</span>}
        </p>
      </Modal>
    </div>
  );
}
