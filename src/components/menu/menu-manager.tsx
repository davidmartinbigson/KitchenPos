"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  ImagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  UtensilsCrossed,
  X,
  LayoutGrid,
  List,
  Type,
  Layers,
  CircleDollarSign,
  Check,
  CheckCircle2,
  CheckSquare,
  Download,
  GripVertical,
  FileSpreadsheet,
} from "lucide-react";
import { CsvImport } from "@/components/menu/csv-import";
import { useI18n } from "@/components/providers/language-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Button, Card, EmptyState, Field, Input, Modal, Select, Textarea, cn, errorText } from "@/components/ui";
import { compressImage, formatMoney, formatNumber } from "@/lib/format";
import type { MenuItemDTO } from "@/lib/types";

const EMOJI_CHOICES = ["🍽️", "🍔", "🍕", "🍛", "🍗", "🥤", "🍰", "🍜", "🌮", "🥗", "🍳", "☕", "🍟", "🥘", "🍢", "🥙", "🧁", "🍦"];
const NEW_CATEGORY = "__new_category__";

type FormState = {
  name: string;
  category: string;
  description: string;
  price: string;
  stock: string;
  cost: string;
  extrasText: string;
  emoji: string;
  available: boolean;
  imageData: string | null;
};

const emptyForm: FormState = {
  name: "",
  category: "",
  description: "",
  price: "",
  stock: "",
  cost: "",
  extrasText: "",
  emoji: "🍽️",
  available: true,
  imageData: null,
};

export function MenuManager({
  initialItems,
  currency,
  itemLimit = 500,
}: {
  initialItems: MenuItemDTO[];
  currency: string;
  itemLimit?: number;
}) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const M = t.menu;

  const [items, setItems] = useState<MenuItemDTO[]>(initialItems);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [itemView, setItemView] = useState<"grid" | "list" | "compact">("grid");
  useEffect(() => {
    try {
      const v = window.localStorage.getItem("kpos-menumgr-view");
      if (v === "grid" || v === "list" || v === "compact") setItemView(v);
    } catch {}
  }, []);
  const pickView = (v: "grid" | "list" | "compact") => {
    setItemView(v);
    try { window.localStorage.setItem("kpos-menumgr-view", v); } catch {}
  };

  /* Bulk select / delete */
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const toggleSelect = (id: number) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const exitSelect = () => { setSelectMode(false); setSelected([]); };
  const [editing, setEditing] = useState<MenuItemDTO | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [newCatMode, setNewCatMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MenuItemDTO | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category))).sort(),
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (i) =>
        (category === "all" || i.category === category) &&
        (!q || i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)),
    );
  }, [items, query, category]);

  /* Sort view (local) + drag & drop reordering (persisted) */
  type OrderMode = "custom" | "nameAsc" | "nameDesc" | "priceAsc" | "priceDesc";
  const [orderMode, setOrderMode] = useState<OrderMode>("custom");
  const displayItems = useMemo(() => {
    if (orderMode === "custom") return filtered;
    const arr = [...filtered];
    if (orderMode === "nameAsc") arr.sort((a, b) => a.name.localeCompare(b.name));
    if (orderMode === "nameDesc") arr.sort((a, b) => b.name.localeCompare(a.name));
    if (orderMode === "priceAsc") arr.sort((a, b) => a.price - b.price);
    if (orderMode === "priceDesc") arr.sort((a, b) => b.price - a.price);
    return arr;
  }, [filtered, orderMode]);

  const dragId = useRef<number | null>(null);
  const canDrag = orderMode === "custom" && !selectMode && query.trim() === "" && category === "all";
  const dragProps = (id: number) =>
    canDrag
      ? {
          draggable: true as const,
          onDragStart: () => { dragId.current = id; },
          onDragOver: (e: React.DragEvent) => e.preventDefault(),
          onDrop: () => moveItem(dragId.current, id),
        }
      : {};

  function moveItem(fromId: number | null, toId: number) {
    if (!fromId || fromId === toId) return;
    const arr = [...items];
    const fi = arr.findIndex((i) => i.id === fromId);
    const ti = arr.findIndex((i) => i.id === toId);
    if (fi < 0 || ti < 0) return;
    const [moved] = arr.splice(fi, 1);
    arr.splice(ti, 0, moved);
    setItems(arr);
    void fetch("/api/menu/reorder", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: arr.map((i) => i.id) }),
    })
      .then((r) => { if (!r.ok) toast.show(t.error, "error"); })
      .catch(() => toast.show(t.error, "error"));
  }

  const money = (n: number) => formatMoney(n, currency);

  function openCreate() {
    if (items.length >= itemLimit) {
      toast.show(M.limitReached, "error");
      return;
    }
    setEditing(null);
    setForm(emptyForm);
    setNewCatMode(false);
    setFormOpen(true);
  }

  function openEdit(item: MenuItemDTO) {
    setEditing(item);
    setForm({
      name: item.name,
      category: item.category === "General" ? "" : item.category,
      description: item.description,
      price: String(item.price),
      stock: item.stockQty == null ? "" : String(item.stockQty),
      cost: item.costPrice ? String(item.costPrice) : "",
      extrasText: (item.extras ?? []).map((e) => `${e.name}=${e.price}`).join("\n"),
      emoji: item.emoji,
      available: item.available,
      imageData: item.imageData,
    });
    setNewCatMode(false);
    setFormOpen(true);
  }

  async function onPickImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImageLoading(true);
    try {
      const dataUrl = await compressImage(file);
      setForm((prev) => ({ ...prev, imageData: dataUrl }));
    } catch {
      toast.show(M.nameRequired, "error");
    } finally {
      setImageLoading(false);
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const price = Math.round(Number(form.price));
    if (!form.name.trim() || !Number.isFinite(price) || price < 0 || form.price === "") {
      toast.show(M.nameRequired, "error");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category: form.category.trim() || "General",
      description: form.description.trim(),
      price,
      stockQty: form.stock === "" ? null : Math.max(0, Math.round(Number(form.stock) || 0)),
      costPrice: form.cost === "" ? 0 : Math.max(0, Math.round(Number(form.cost) || 0)),
      extras: form.extrasText
        .split("\n")
        .map((row) => {
          const parts = row.split("=");
          return {
            name: (parts[0] ?? "").trim().slice(0, 40),
            price: Math.max(0, Math.round(Number((parts[1] ?? "").trim()) || 0)),
          };
        })
        .filter((e) => e.name)
        .slice(0, 10),
      emoji: form.emoji,
      available: form.available,
      imageData: form.imageData,
    };
    try {
      const res = await fetch(editing ? `/api/menu/${editing.id}` : "/api/menu", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        item?: MenuItemDTO;
      };
      if (!res.ok || !data.item) {
        toast.show(errorText(data.error, t), "error");
        setSaving(false);
        return;
      }
      const saved = data.item;
      setItems((prev) =>
        editing ? prev.map((i) => (i.id === saved.id ? saved : i)) : [saved, ...prev],
      );
      toast.show(M.saved, "success");
      setFormOpen(false);
    } catch {
      toast.show(t.networkError, "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailable(item: MenuItemDTO) {
    const next = !item.available;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, available: next } : i)));
    const res = await fetch(`/api/menu/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: next }),
    });
    if (!res.ok) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, available: item.available } : i)));
      toast.show(t.error, "error");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/menu/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      toast.show(M.deleted, "success");
    } else {
      toast.show(t.error, "error");
    }
    setDeleting(false);
    setDeleteTarget(null);
  }

  async function confirmBulkDelete() {
    if (selected.length === 0) return;
    setBulkDeleting(true);
    const results = await Promise.all(
      selected.map(async (id) => {
        try {
          const res = await fetch(`/api/menu/${id}`, { method: "DELETE" });
          return { id, ok: res.ok };
        } catch {
          return { id, ok: false };
        }
      }),
    );
    setBulkDeleting(false);
    const gone = new Set(results.filter((r) => r.ok).map((r) => r.id));
    const failed = results.length - gone.size;
    if (gone.size > 0) {
      setItems((prev) => prev.filter((i) => !gone.has(i.id)));
      toast.show(M.bulkDeleted, "success");
    }
    if (failed > 0) toast.show(`${failed} ✕ — ${t.error}`, "error");
    setBulkDeleteOpen(false);
    exitSelect();
  }

  const availableCount = items.filter((i) => i.available).length;

  const stats = [
    { label: M.itemsCount, value: items.length, icon: UtensilsCrossed, color: "from-orange-500 to-rose-500" },
    { label: t.menu.category, value: categories.length, icon: Layers, color: "from-sky-500 to-indigo-500" },
    { label: M.available, value: availableCount, icon: CheckCircle2, color: "from-emerald-500 to-teal-500" },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">{M.title}</h1>
          <p className="mt-1 text-slate-600">{M.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={cn(
              "flex h-13 items-center rounded-2xl px-4 text-xs font-bold ring-1",
              items.length >= itemLimit
                ? "bg-red-50 text-red-600 ring-red-200"
                : items.length >= itemLimit * 0.9
                  ? "bg-amber-50 text-amber-700 ring-amber-200"
                  : "bg-white text-slate-600 ring-slate-200",
            )}
            title={M.limitUsage}
          >
            {formatNumber(items.length, lang)} / {formatNumber(itemLimit, lang)} {M.limitUsage}
          </span>
          <Button size="lg" variant="secondary" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" /> {t.importer.button}
          </Button>
          <Button size="lg" variant="secondary" onClick={() => (window.location.href = "/api/menu/export")}>
            <Download className="h-5 w-5 text-sky-600" /> {M.exportCsv}
          </Button>
          <Button size="lg" onClick={openCreate} className="group">
            <Plus className="h-5 w-5 transition group-hover:rotate-90" /> {M.addItem}
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-3 sm:gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Card className="flex items-center gap-3 p-4">
                <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg", s.color)}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xl font-black text-slate-900">{formatNumber(s.value, lang)}</p>
                  <p className="truncate text-xs font-semibold text-slate-500">{s.label}</p>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </section>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search} className="ps-12" />
        </div>
        <div className="flex shrink-0 gap-1 self-end rounded-2xl bg-white p-1 ring-1 ring-slate-200 md:self-auto">
          <button
            type="button"
            title={t.pos.gridView}
            aria-label={t.pos.gridView}
            onClick={() => pickView("grid")}
            className={cn(
              "grid h-9 w-9 place-items-center rounded-xl transition",
              itemView === "grid" ? "bg-orange-500 text-white shadow" : "text-slate-400 hover:text-slate-700",
            )}
          >
            <LayoutGrid className="h-4.5 w-4.5" />
          </button>
          <button
            type="button"
            title={t.pos.listView}
            aria-label={t.pos.listView}
            onClick={() => pickView("list")}
            className={cn(
              "grid h-9 w-9 place-items-center rounded-xl transition",
              itemView === "list" ? "bg-orange-500 text-white shadow" : "text-slate-400 hover:text-slate-700",
            )}
          >
            <List className="h-4.5 w-4.5" />
          </button>
          <button
            type="button"
            title={t.pos.textView}
            aria-label={t.pos.textView}
            onClick={() => pickView("compact")}
            className={cn(
              "grid h-9 w-9 place-items-center rounded-xl transition",
              itemView === "compact" ? "bg-orange-500 text-white shadow" : "text-slate-400 hover:text-slate-700",
            )}
          >
            <Type className="h-4.5 w-4.5" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}
          className={cn(
            "flex shrink-0 items-center gap-2 self-end rounded-2xl px-4 py-2 text-sm font-bold ring-1 transition md:self-auto",
            selectMode
              ? "bg-orange-500 text-white ring-orange-500 shadow"
              : "bg-white text-slate-600 ring-slate-200 hover:text-slate-900",
          )}
        >
          <CheckSquare className="h-4 w-4" /> {M.select}
        </button>
        <select
          value={orderMode}
          onChange={(e) => setOrderMode(e.target.value as typeof orderMode)}
          title={M.dragHint}
          className="h-10 shrink-0 cursor-pointer rounded-2xl bg-white px-3 text-sm font-bold text-slate-600 ring-1 ring-slate-200 transition hover:text-slate-900"
        >
          <option value="custom">{M.sortCustom}</option>
          <option value="nameAsc">{M.sortNameAsc}</option>
          <option value="nameDesc">{M.sortNameDesc}</option>
          <option value="priceAsc">{M.sortPriceAsc}</option>
          <option value="priceDesc">{M.sortPriceDesc}</option>
        </select>
      </div>
      {categories.length > 0 && (
        <div className="scroll-thin -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {["all", ...categories].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "shrink-0 rounded-2xl px-4 py-2 text-sm font-semibold transition",
                category === cat
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:text-slate-900",
              )}
            >
              {cat === "all" ? M.allCategories : cat}
            </button>
          ))}
        </div>
      )}

      {selectMode && items.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-orange-200">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 accent-orange-500"
              checked={filtered.length > 0 && filtered.every((i) => selected.includes(i.id))}
              onChange={(e) => setSelected(e.target.checked ? filtered.map((i) => i.id) : [])}
            />
            {M.selectAll}
          </label>
          <span className="text-sm font-black text-orange-600">{selected.length} ✓</span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={exitSelect}>{t.cancel}</Button>
            <Button
              variant="danger"
              className="!bg-red-600 !text-white hover:!bg-red-700"
              disabled={selected.length === 0}
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" /> {M.bulkDelete} ({selected.length})
            </Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed className="h-8 w-8" />}
          title={M.noItems}
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={openCreate}>{M.addItem}</Button>
              <Button variant="secondary" onClick={() => setImportOpen(true)}>
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> {t.importer.button}
              </Button>
            </div>
          }
        />
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-slate-500">{t.pos.emptyFilter}</p>
      ) : itemView === "grid" ? (
        <motion.div layout className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {displayItems.map((item, i) => (
              <motion.div
                layout
                key={item.id}
                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                onClick={selectMode ? () => toggleSelect(item.id) : undefined}
                className={selectMode ? "cursor-pointer" : undefined}
                {...dragProps(item.id)}
              >
                <Card hover className={cn(
                  "group flex h-full flex-col overflow-hidden p-0",
                  selectMode && selected.includes(item.id) && "ring-2 ring-orange-500",
                )}>
                  <div className="relative h-44 overflow-hidden bg-gradient-to-br from-orange-100 via-amber-50 to-rose-100">
                    {item.imageData ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageData} alt={item.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-7xl transition duration-700 group-hover:scale-110">
                        {item.emoji}
                      </span>
                    )}
                    <span className="absolute start-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-700 shadow-sm backdrop-blur">
                      {item.category}
                    </span>
                    <span className="absolute end-3 top-3 rounded-2xl bg-slate-950/85 px-3 py-1.5 text-sm font-black text-white shadow-lg">
                      {money(item.price)}
                    </span>
                    {selectMode && (
                      <span
                        className={cn(
                          "absolute start-2 bottom-2 grid h-7 w-7 place-items-center rounded-full shadow ring-2 transition",
                          selected.includes(item.id)
                            ? "bg-orange-500 text-white ring-orange-500"
                            : "bg-white/90 text-slate-400 ring-white",
                        )}
                      >
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                    {canDrag && (
                      <span className="absolute end-2 bottom-2 grid h-7 w-7 cursor-grab place-items-center rounded-full bg-white/90 text-slate-500 shadow ring-1 ring-slate-200">
                        <GripVertical className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-lg font-black text-slate-900">{item.name}</h3>
                    </div>
                    <p className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-sm text-slate-500">
                      {item.description || "—"}
                    </p>
                    {!selectMode && (
                    <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                      <button
                        onClick={() => toggleAvailable(item)}
                        className={cn(
                          "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition",
                          item.available
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-500 ring-slate-200 hover:bg-slate-200",
                        )}
                      >
                        <span
                          className={cn(
                            "relative h-4 w-7 rounded-full transition",
                            item.available ? "bg-emerald-500" : "bg-slate-300",
                          )}
                        >
                          <span
                            className={cn(
                              "absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all",
                              item.available ? "start-3.5" : "start-0.5",
                            )}
                          />
                        </span>
                        {item.available ? M.available : M.unavailable}
                      </button>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEdit(item)}
                          aria-label={t.edit}
                          className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-orange-100 hover:text-orange-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          aria-label={t.delete}
                          className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-red-100 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : itemView === "list" ? (
        <div className={cn("grid gap-2 sm:gap-2.5", filtered.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
          <AnimatePresence mode="popLayout">
            {displayItems.map((item, i) => (
              <motion.div
                layout
                key={item.id}
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 14 }}
                transition={{ delay: Math.min(i * 0.02, 0.25), duration: 0.3 }}
                onClick={selectMode ? () => toggleSelect(item.id) : undefined}
                {...dragProps(item.id)}
                className={cn(
                  "flex items-center gap-2 rounded-3xl bg-white p-2 shadow-[0_6px_24px_-12px_rgba(15,23,42,0.2)] ring-1 ring-slate-100 transition hover:shadow-md hover:ring-orange-200 sm:gap-3 sm:p-3",
                  selectMode && "cursor-pointer",
                  selectMode && selected.includes(item.id) && "ring-2 ring-orange-500",
                )}
              >
                {selectMode && (
                  <span
                    className={cn(
                      "grid h-6 w-6 shrink-0 place-items-center rounded-full ring-2 transition",
                      selected.includes(item.id)
                        ? "bg-orange-500 text-white ring-orange-500"
                        : "bg-white text-slate-400 ring-slate-300",
                    )}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
                {canDrag && (
                  <span className="grid h-8 w-5 shrink-0 cursor-grab place-items-center text-slate-300">
                    <GripVertical className="h-4 w-4" />
                  </span>
                )}
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-orange-100 via-amber-50 to-rose-100 sm:h-16 sm:w-16">
                  {item.imageData ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageData} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="grid h-full w-full place-items-center text-3xl">{item.emoji}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-black text-slate-900">{item.name}</h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                      {item.category}
                    </span>
                  </div>
                  <p className="mt-0.5 hidden truncate text-xs text-slate-500 sm:block">{item.description || "—"}</p>
                </div>
                <span className="shrink-0 rounded-2xl bg-slate-950/85 px-2 py-1 text-xs font-black text-white shadow sm:px-3 sm:py-1.5 sm:text-sm">
                  {money(item.price)}
                </span>
                {!selectMode && (<>
                <button
                  onClick={() => toggleAvailable(item)}
                  title={item.available ? M.available : M.unavailable}
                  className={cn(
                    "shrink-0 flex items-center gap-2 rounded-full px-2 py-1.5 text-xs font-bold ring-1 transition sm:px-3",
                    item.available
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100"
                      : "bg-slate-100 text-slate-500 ring-slate-200 hover:bg-slate-200",
                  )}
                >
                  <span
                    className={cn("relative h-4 w-7 rounded-full transition", item.available ? "bg-emerald-500" : "bg-slate-300")}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all",
                        item.available ? "start-3.5" : "start-0.5",
                      )}
                    />
                  </span>
                  <span className="hidden sm:inline">{item.available ? M.available : M.unavailable}</span>
                </button>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={() => openEdit(item)}
                    aria-label={t.edit}
                    className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-orange-100 hover:text-orange-700 sm:h-9 sm:w-9"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(item)}
                    aria-label={t.delete}
                    className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-red-100 hover:text-red-600 sm:h-9 sm:w-9"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                </>)}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] sm:gap-2">
          <AnimatePresence mode="popLayout">
            {displayItems.map((item, i) => (
              <motion.div
                layout
                key={item.id}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ delay: Math.min(i * 0.01, 0.2), duration: 0.2 }}
                onClick={selectMode ? () => toggleSelect(item.id) : undefined}
                {...dragProps(item.id)}
                className={cn(
                  "relative flex h-16 flex-col justify-between overflow-hidden rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-100 transition hover:shadow sm:h-[4.25rem]",
                  selectMode && "cursor-pointer",
                  selectMode && selected.includes(item.id) && "ring-2 ring-orange-500",
                  !item.available && "opacity-60",
                )}
              >
                <p className="line-clamp-1 text-[11px] font-bold leading-tight text-slate-900 sm:text-xs">{item.name}</p>
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-[11px] font-black text-orange-600 sm:text-xs">{money(item.price)}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    <span className={cn("h-2 w-2 rounded-full", item.available ? "bg-emerald-500" : "bg-slate-300")} title={item.available ? M.available : M.unavailable} />
                    {selectMode && (
                      <span className={cn(
                        "grid h-4 w-4 place-items-center rounded-full ring-1",
                        selected.includes(item.id) ? "bg-orange-500 text-white ring-orange-500" : "bg-white text-slate-400 ring-slate-300",
                      )}>
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    )}
                    {!selectMode && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(item); }}
                        aria-label={t.edit}
                        className="grid h-6 w-6 place-items-center rounded-md bg-slate-100 text-slate-500 transition hover:bg-orange-100 hover:text-orange-700"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <CsvImport
        open={importOpen}
        onClose={() => setImportOpen(false)}
        currency={currency}
        onImported={(imported) => setItems((prev) => [...imported, ...prev])}
      />

      {/* Create / edit modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? M.editItem : M.newItem}
        wide
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" form="menu-item-form" loading={saving}>
              {saving ? t.saving : t.save}
            </Button>
          </div>
        }
      >
        <form id="menu-item-form" onSubmit={onSubmit} className="grid gap-6 md:grid-cols-[220px_1fr]">
          {/* Image */}
          <div className="space-y-3">
            <span className="block text-sm font-semibold text-slate-700">{M.image}</span>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="group relative grid aspect-square w-full place-items-center overflow-hidden rounded-3xl border-2 border-dashed border-orange-300 bg-gradient-to-br from-orange-50 to-rose-50 transition hover:border-orange-500"
            >
              {form.imageData ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.imageData} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-2 text-center text-orange-600">
                  <span className="text-6xl transition group-hover:scale-110">{form.emoji}</span>
                  <span className="flex items-center gap-1.5 text-sm font-bold">
                    <Camera className="h-4 w-4" /> {M.uploadImage}
                  </span>
                </span>
              )}
              {imageLoading && (
                <span className="absolute inset-0 grid place-items-center bg-white/70 text-sm font-bold text-orange-600">
                  …
                </span>
              )}
              {form.imageData && (
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-slate-950/70 py-2 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100">
                  <ImagePlus className="h-3.5 w-3.5" /> {M.changeImage}
                </span>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
            <p className="text-xs text-slate-500">{M.imageHint}</p>
            {form.imageData && (
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, imageData: null }))}
                className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:underline"
              >
                <X className="h-3.5 w-3.5" /> {M.removeImage}
              </button>
            )}
          </div>

          {/* Fields */}
          <div className="space-y-5">
            <Field label={M.itemName}>
              <Input
                required
                maxLength={120}
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Chicken Karahi"
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={M.category}>
                <Select
                  value={newCatMode ? NEW_CATEGORY : form.category}
                  onChange={(e) => {
                    if (e.target.value === NEW_CATEGORY) {
                      setNewCatMode(true);
                      setForm((p) => ({ ...p, category: "" }));
                    } else {
                      setNewCatMode(false);
                      setForm((p) => ({ ...p, category: e.target.value }));
                    }
                  }}
                >
                  {!form.category && !newCatMode && (
                    <option value="" disabled>
                      {M.selectCategory}
                    </option>
                  )}
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value={NEW_CATEGORY}>{M.newCategory}</option>
                </Select>
                {newCatMode && (
                  <Input
                    className="mt-2.5"
                    maxLength={60}
                    autoFocus
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    placeholder={M.newCategoryName}
                  />
                )}
              </Field>
              <Field label={M.price}>
                <div className="relative">
                  <CircleDollarSign className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <Input
                    required
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    value={form.price}
                    onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                    className="ps-12"
                    placeholder={`${currency} 0`}
                  />
                </div>
              </Field>
              <Field label={M.stockQty} hint={M.stockQtyHint}>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={form.stock}
                  onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))}
                  placeholder={M.stockQtyPh}
                />
              </Field>
              <Field label={M.costPrice} hint={M.costPriceHint}>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={form.cost}
                  onChange={(e) => setForm((p) => ({ ...p, cost: e.target.value }))}
                />
              </Field>
              <Field label={M.extrasLabel} hint={M.extrasHint}>
                <Textarea
                  rows={3}
                  value={form.extrasText}
                  onChange={(e) => setForm((p) => ({ ...p, extrasText: e.target.value }))}
                  placeholder={"Extra Cheese=120\nLarge=150"}
                />
              </Field>
            </div>
            <Field label={M.description}>
              <Textarea
                maxLength={400}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Spicy, served with naan"
              />
            </Field>
            <div>
              <span className="mb-2 block text-sm font-semibold text-slate-700">{M.emoji}</span>
              <div className="flex flex-wrap gap-2">
                {EMOJI_CHOICES.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, emoji }))}
                    className={cn(
                      "grid h-10 w-10 place-items-center rounded-xl text-xl transition hover:scale-110",
                      form.emoji === emoji ? "bg-orange-100 ring-2 ring-orange-400" : "bg-slate-50 ring-1 ring-slate-200",
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
              <span className="font-semibold text-slate-700">{M.available}</span>
              <input
                type="checkbox"
                checked={form.available}
                onChange={(e) => setForm((p) => ({ ...p, available: e.target.checked }))}
                className="h-5 w-5 accent-orange-500"
              />
            </label>
          </div>
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
            <Button variant="danger" className="!bg-red-600 !text-white hover:!bg-red-700" loading={deleting} onClick={confirmDelete}>
              <Trash2 className="h-4 w-4" /> {t.delete}
            </Button>
          </div>
        }
      >
        <p className="text-slate-600">
          {M.deleteConfirm}
          {deleteTarget && <span className="mt-2 block font-bold text-slate-900">{deleteTarget.name}</span>}
        </p>
      </Modal>

      {/* Bulk delete confirm */}
      <Modal
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        title={M.bulkDelete}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setBulkDeleteOpen(false)}>
              {t.cancel}
            </Button>
            <Button
              variant="danger"
              className="!bg-red-600 !text-white hover:!bg-red-700"
              loading={bulkDeleting}
              onClick={confirmBulkDelete}
            >
              <Trash2 className="h-4 w-4" /> {M.bulkDelete} ({selected.length})
            </Button>
          </div>
        }
      >
        <p className="text-slate-600">
          {M.bulkDeleteQ}
          <span className="mt-2 block font-black text-red-600">{selected.length} items ✕</span>
        </p>
      </Modal>
    </div>
  );
}
