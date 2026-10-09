"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  BadgeDollarSign,
  CookingPot,
  Lock,
  AtSign,
  Plus,
  Trash2,
  Users,
  UserPlus,
  UserRound,
  X,
  Pencil,
} from "lucide-react";
import { useI18n } from "@/components/providers/language-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Skeleton, cn, errorText } from "@/components/ui";
import { formatDate } from "@/lib/format";

type StaffMember = {
  id: number;
  name: string;
  email: string;
  role: string;
  categories: string[];
  active: boolean;
  createdAt: string;
};

const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "chef",
  categories: [] as string[],
  active: true,
};

export function StaffManager({ suggestions }: { suggestions: string[] }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const T = t.team;

  const [members, setMembers] = useState<StaffMember[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [categoryInput, setCategoryInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  function load() {
    fetch("/api/staff")
      .then((r) => r.json())
      .then((data: { staff: StaffMember[] }) => setMembers(data.staff ?? []))
      .catch(() => setMembers([]));
  }

  useEffect(load, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(member: StaffMember) {
    setEditing(member);
    setForm({
      name: member.name,
      email: member.email,
      password: "",
      role: member.role,
      categories: member.categories,
      active: member.active,
    });
    setFormOpen(true);
  }

  function addCategory(value: string) {
    const clean = value.trim();
    if (!clean) return;
    if (form.categories.some((c) => c.toLowerCase() === clean.toLowerCase())) return;
    setForm((prev) => ({ ...prev, categories: [...prev.categories, clean] }));
  }

  function removeCategory(value: string) {
    setForm((prev) => ({ ...prev, categories: prev.categories.filter((c) => c !== value) }));
  }

  function mapError(code?: string) {
    if (code === "STAFF_LIMIT") return T.staffLimit;
    return errorText(code, t);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/staff/${editing.id}` : "/api/staff", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          ...(form.password ? { password: form.password } : {}),
          role: form.role,
          categories: form.categories,
          active: form.active,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.show(mapError(data.error), "error");
        setSaving(false);
        return;
      }
      toast.show(T.saved, "success");
      setFormOpen(false);
      load();
    } catch {
      toast.show(t.networkError, "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(member: StaffMember) {
    setBusyId(member.id);
    const res = await fetch(`/api/staff/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !member.active }),
    });
    if (res.ok) {
      toast.show(T.saved, "success");
      load();
    } else toast.show(t.error, "error");
    setBusyId(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/staff/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.show(T.deleted, "success");
      load();
    } else toast.show(t.error, "error");
    setDeleting(false);
    setDeleteTarget(null);
  }

  const roleIcon = (role: string) => (role === "chef" ? CookingPot : BadgeDollarSign);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">{T.title}</h1>
          <p className="mt-1 text-slate-600">{T.subtitle}</p>
        </div>
        <Button size="lg" onClick={openCreate} className="group">
          <UserPlus className="h-5 w-5 transition group-hover:rotate-6" /> {T.add}
        </Button>
      </header>

      {!members ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title={T.empty}
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> {T.add}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {members.map((member, i) => {
            const Icon = roleIcon(member.role);
            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.06, 0.4) }}
              >
                <Card hover className="flex h-full flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={cn(
                        "grid h-13 w-13 place-items-center rounded-2xl bg-gradient-to-br p-3.5 text-white shadow-lg",
                        member.role === "chef"
                          ? "from-orange-500 to-rose-500 shadow-orange-500/30"
                          : "from-emerald-500 to-teal-500 shadow-emerald-500/30",
                      )}
                    >
                      <Icon className="h-6 w-6" />
                    </span>
                    <Badge tone={member.active ? "green" : "red"}>
                      {member.active ? T.enabled : T.disabled}
                    </Badge>
                  </div>

                  <h3 className="mt-4 text-lg font-black text-slate-900">{member.name}</h3>
                  <p className="flex items-center gap-1.5 truncate text-sm text-slate-500">
                    <AtSign className="h-3.5 w-3.5 shrink-0" /> {member.email}
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                    {member.role === "chef" ? T.chef : T.cashier} · {T.created}:{" "}
                    {formatDate(member.createdAt, lang)}
                  </p>

                  {member.role === "chef" && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-slate-500">{T.categories}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {member.categories.length === 0 ? (
                          <Badge tone="orange">{t.nav.menu}</Badge>
                        ) : (
                          member.categories.map((c) => (
                            <Badge key={c} tone="orange">
                              {c}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-auto flex items-center gap-2 pt-5">
                    <Button size="sm" variant="secondary" onClick={() => openEdit(member)} className="flex-1">
                      <Pencil className="h-3.5 w-3.5" /> {t.edit}
                    </Button>
                    <Button
                      size="sm"
                      variant={member.active ? "secondary" : "success"}
                      disabled={busyId === member.id}
                      onClick={() => toggleActive(member)}
                    >
                      {member.active ? <X className="h-4 w-4" /> : <BadgeCheck className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setDeleteTarget(member)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create / edit modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? T.edit : T.add}
        wide
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" form="staff-form" loading={saving}>
              {saving ? t.saving : t.save}
            </Button>
          </div>
        }
      >
        <form id="staff-form" onSubmit={onSubmit} className="space-y-5">
          {/* Role picker */}
          <div>
            <span className="mb-2 block text-sm font-semibold text-slate-700">{T.role}</span>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["chef", "cashier"] as const).map((role) => {
                const Icon = roleIcon(role);
                const active = form.role === role;
                return (
                  <button
                    type="button"
                    key={role}
                    onClick={() => setForm((p) => ({ ...p, role }))}
                    className={cn(
                      "rounded-2xl p-4 text-start ring-2 transition",
                      active
                        ? role === "chef"
                          ? "bg-gradient-to-br from-orange-500 to-rose-500 text-white ring-orange-400 shadow-lg shadow-orange-500/30"
                          : "bg-gradient-to-br from-emerald-500 to-teal-500 text-white ring-emerald-400 shadow-lg shadow-emerald-500/30"
                        : "bg-white text-slate-800 ring-slate-200 hover:ring-orange-300",
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-5 w-5" />
                      <span className="font-black">{role === "chef" ? T.chef : T.cashier}</span>
                    </div>
                    <p className={cn("mt-2 text-xs leading-relaxed", active ? "text-white/90" : "text-slate-500")}>
                      {role === "chef" ? T.chefDesc : T.cashierDesc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={T.name}>
              <div className="relative">
                <UserRound className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="ps-12" placeholder="Ali Raza" maxLength={100} />
              </div>
            </Field>
            <Field label={T.email} hint={T.emailHint}>
              <div className="relative">
                <AtSign className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input required type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className="ps-12" dir="ltr" />
              </div>
            </Field>
          </div>

          <Field label={editing ? T.newPassword : T.password}>
            <div className="relative">
              <Lock className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                className="ps-12"
                minLength={6}
                required={!editing}
                autoComplete="new-password"
                placeholder="••••••••"
              />
            </div>
          </Field>

          {form.role === "chef" && (
            <div>
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">{T.categories}</span>
              <p className="mb-3 text-xs text-slate-500">{T.categoriesHint}</p>
              <div className="flex flex-wrap gap-2">
                {form.categories.map((c) => (
                  <span key={c} className="flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
                    {c}
                    <button type="button" aria-label="x" onClick={() => removeCategory(c)} className="text-orange-500 hover:text-orange-800">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              {suggestions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {suggestions
                    .filter((s) => !form.categories.includes(s))
                    .map((s) => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => addCategory(s)}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-orange-50 hover:text-orange-700"
                      >
                        + {s}
                      </button>
                    ))}
                </div>
              )}
              <Input
                className="mt-3"
                value={categoryInput}
                onChange={(e) => setCategoryInput(e.target.value)}
                placeholder={T.typeCategory}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCategory(categoryInput);
                    setCategoryInput("");
                  }
                }}
              />
            </div>
          )}

          <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
            <span className="font-semibold text-slate-700">{T.active}</span>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
              className="h-5 w-5 accent-orange-500"
            />
          </label>

          <p className="rounded-2xl bg-sky-50 px-4 py-3 text-xs text-sky-800 ring-1 ring-sky-200">{T.credentialNote}</p>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={t.delete}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              {t.cancel}
            </Button>
            <Button className="!bg-rose-600 !text-white" loading={deleting} onClick={confirmDelete}>
              <Trash2 className="h-4 w-4" /> {t.delete}
            </Button>
          </div>
        }
      >
        <p className="text-slate-600">
          {T.deleteConfirm}
          {deleteTarget && <span className="mt-2 block font-bold text-slate-900">{deleteTarget.name}</span>}
        </p>
      </Modal>
    </div>
  );
}
