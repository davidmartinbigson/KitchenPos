"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { motion } from "framer-motion";
import { Download, FileSpreadsheet, Info, UploadCloud, CheckCircle2, AlertTriangle } from "lucide-react";
import { useI18n } from "@/components/providers/language-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Button, Modal, cn } from "@/components/ui";
import {
  CSV_TEMPLATE,
  isValidImportRow,
  parseMenuSheet,
  parseSheetPrice,
  type ImportRow,
} from "@/lib/csv";
import type { MenuItemDTO } from "@/lib/types";

export function CsvImport({
  open,
  onClose,
  onImported,
  currency,
}: {
  open: boolean;
  onClose: () => void;
  onImported: (items: MenuItemDTO[]) => void;
  currency: string;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const I = t.importer;

  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [invalidCount, setInvalidCount] = useState(0);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setRows(null);
    setInvalidCount(0);
    setFileName("");
  }

  async function handleFile(file: File) {
    try {
      const text = await file.text();
      const parsed = parseMenuSheet(text);
      if (parsed.rows.length === 0) {
        toast.show(I.noValidRows, "error");
        return;
      }
      setRows(parsed.rows);
      setInvalidCount(parsed.invalidCount);
      setFileName(file.name);
    } catch {
      toast.show(I.parseError, "error");
    }
  }

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) handleFile(file);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "kitchen-pos-menu-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function runImport() {
    if (!rows) return;
    setImporting(true);
    try {
      const res = await fetch("/api/menu/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        imported?: number;
        items?: MenuItemDTO[];
        error?: string;
      };
      if (!res.ok || !data.items) {
        toast.show(data.error === "NO_ROWS" ? I.noValidRows : t.error, "error");
        setImporting(false);
        return;
      }
      onImported(data.items);
      toast.show(`${data.imported} ${I.done}`, "success");
      reset();
      onClose();
    } catch {
      toast.show(t.networkError, "error");
    } finally {
      setImporting(false);
    }
  }

  const validCount = rows ? rows.length - invalidCount : 0;

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={I.title}
      wide
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="secondary" onClick={downloadTemplate}>
            <Download className="h-4 w-4" /> {I.template}
          </Button>
          <div className="flex gap-3">
            {rows && (
              <Button variant="ghost" onClick={reset}>
                {t.cancel}
              </Button>
            )}
            <Button onClick={runImport} loading={importing} disabled={!rows || validCount === 0}>
              {importing ? I.importing : I.importNow}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <p className="text-sm text-slate-600">{I.subtitle}</p>

        {!rows ? (
          <>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "grid cursor-pointer place-items-center rounded-3xl border-2 border-dashed px-6 py-12 text-center transition",
                dragging
                  ? "border-orange-500 bg-orange-50"
                  : "border-slate-300 bg-slate-50 hover:border-orange-400 hover:bg-orange-50/50",
              )}
            >
              <UploadCloud className={cn("h-12 w-12 transition", dragging ? "text-orange-500" : "text-slate-400")} />
              <p className="mt-3 font-bold text-slate-800">{I.chooseFile}</p>
              <p className="mt-1 text-sm text-slate-500">{I.dropHint}</p>
            </div>
            <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onPick} />

            <div className="space-y-2 rounded-2xl bg-sky-50 p-4 text-sm text-sky-900 ring-1 ring-sky-200">
              <p className="flex items-center gap-2 font-bold">
                <Info className="h-4 w-4" /> {I.columns}
              </p>
              <p className="font-mono text-xs leading-relaxed text-sky-800">{I.columnsHint}</p>
              <p className="text-xs">{I.excelHint}</p>
              <p className="text-xs">{I.imageHint}</p>
            </div>
          </>
        ) : (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
              <span className="min-w-0 flex-1 truncate font-bold text-slate-800">{fileName}</span>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                {rows.length} {I.rowsFound}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
                <p className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> {validCount} {I.willImport}
                </p>
              </div>
              <div
                className={cn(
                  "rounded-2xl p-4 ring-1",
                  invalidCount > 0 ? "bg-amber-50 ring-amber-200" : "bg-slate-50 ring-slate-200",
                )}
              >
                <p
                  className={cn(
                    "flex items-center gap-2 text-sm font-bold",
                    invalidCount > 0 ? "text-amber-700" : "text-slate-500",
                  )}
                >
                  <AlertTriangle className="h-4 w-4" /> {invalidCount} {I.willSkip}
                </p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-bold text-slate-700">{I.preview}</p>
              <div className="scroll-thin max-h-72 overflow-auto rounded-2xl ring-1 ring-slate-200">
                <table className="w-full text-start text-sm">
                  <thead className="sticky top-0 bg-slate-100 text-xs uppercase text-slate-600">
                    <tr>
                      <th className="px-3 py-2 text-start">{t.menu.itemName}</th>
                      <th className="px-3 py-2 text-start">{t.menu.category}</th>
                      <th className="px-3 py-2 text-end">{t.menu.price}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {rows.slice(0, 50).map((row, i) => {
                      const price = parseSheetPrice(row.price);
                      const bad = !isValidImportRow(row);
                      return (
                        <tr key={i} className={cn(bad && "bg-amber-50/70 text-amber-800")}>
                          <td className="px-3 py-2 font-semibold">{row.name || "—"}</td>
                          <td className="px-3 py-2 text-slate-500">{row.category || "General"}</td>
                          <td className="px-3 py-2 text-end font-bold">
                            {bad ? "—" : `${currency} ${Math.round(price).toLocaleString("en-US")}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </Modal>
  );
}
