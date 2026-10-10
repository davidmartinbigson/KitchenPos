"use client";

import { useEffect, useState } from "react";
import { QrCode, Link2, Download, Printer, UtensilsCrossed } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { useI18n } from "@/components/providers/language-provider";

export function QrMenuCard({
  restaurantId,
  shopName,
  addons = {},
  tableCount = 12,
}: {
  restaurantId: number;
  shopName: string;
  addons?: Record<string, boolean>;
  tableCount?: number;
}) {
  const { lang } = useI18n();
  const [menuUrl, setMenuUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const tablesOn = addons.tables === true;
  const count = Math.min(60, Math.max(2, tableCount));

  const L =
    lang === "ur"
      ? {
          title: "QR مینیو — ٹیبل آرڈرنگ",
          desc: "گاہک اس QR کوڈ کو اسکین کر کے خود مینیو دیکھ کر آرڈر کر سکتے ہیں۔ آرڈر سیدھا آپ کے سسٹم میں آئے گا۔",
          link: "مینیو لنک",
          copy: "کاپی",
          copied: "کاپی ہو گیا ✓",
          download: "QR ڈاؤن لوڈ",
          print: "پرنٹ کارڈ",
          scan: "آرڈر کرنے کے لیے اسکین کریں",
          tablesTitle: "ٹیبل QR کارڈز",
          tablesDesc: "ہر ٹیبل کا اپنا QR — آرڈر اسی ٹیبل کے نام سے آئے گا۔",
          printAll: "سب ٹیبل کارڈز پرنٹ کریں",
          table: "ٹیبل",
        }
      : {
          title: "QR Menu — Table Ordering",
          desc: "Customers scan this QR code to browse your menu and place orders themselves. Orders flow straight into your system.",
          link: "Menu link",
          copy: "Copy",
          copied: "Copied ✓",
          download: "Download QR",
          print: "Print card",
          scan: "Scan to order",
          tablesTitle: "Table QR cards",
          tablesDesc: "Each table has its own QR — the order arrives tagged with that table's name.",
          printAll: "Print all table cards",
          table: "Table",
        };

  useEffect(() => {
    const url = `${window.location.origin}/r/${restaurantId}`;
    setMenuUrl(url);
    let cancelled = false;
    import("qrcode")
      .then((QRCode) =>
        QRCode.toDataURL(url, { width: 640, margin: 1, color: { dark: "#0f172a", light: "#ffffff" } }),
      )
      .then((img) => {
        if (!cancelled) setQrDataUrl(img);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(menuUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  function downloadQr() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `${shopName.replace(/\s+/g, "-").toLowerCase()}-menu-qr.png`;
    a.click();
  }

  const cardHtml = (qr: string, label: string, sub: string) => `
<div class="card">
  ${sub ? `<p class="table">${sub}</p>` : ""}
  <h1>${label}</h1>
  <p>Order from your table — no app needed</p>
  <img class="qr" src="${qr}" alt="Menu QR code" />
  <p>Point your phone camera at the code</p>
  <div class="badge">${L.scan}</div>
</div>`;

  const pageStyle = `<style>
  body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;margin:0;display:flex;flex-wrap:wrap;gap:16px;justify-content:center;padding:20px;background:#fff}
  .card{border:3px solid #f97316;border-radius:28px;padding:24px;text-align:center;width:320px;break-inside:avoid}
  .qr{width:240px;height:240px;margin:12px auto}
  h1{margin:0;font-size:22px;color:#0f172a}
  p{margin:6px 0 0;color:#64748b;font-size:13px}
  .table{margin:0 0 4px;font-size:15px;font-weight:800;color:#f97316;letter-spacing:1px}
  .badge{display:inline-block;margin-top:14px;background:#f97316;color:#fff;font-weight:700;padding:8px 18px;border-radius:999px;font-size:13px}
  @media print{.card{page-break-inside:avoid}}
</style>`;

  function printCard() {
    if (!qrDataUrl) return;
    const w = window.open("", "_blank", "width=520,height=700");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>${shopName} — QR</title>${pageStyle}</head><body>${cardHtml(qrDataUrl, shopName, "")}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  }

  async function printAllTables() {
    try {
      const QRCode = await import("qrcode");
      const imgs = await Promise.all(
        Array.from({ length: count }, (_, i) =>
          QRCode.toDataURL(`${window.location.origin}/r/${restaurantId}?table=${i + 1}`, {
            width: 480,
            margin: 1,
            color: { dark: "#0f172a", light: "#ffffff" },
          }),
        ),
      );
      const w = window.open("", "_blank", "width=1100,height=800");
      if (!w) return;
      const cards = imgs.map((img, i) => cardHtml(img, shopName, `${L.table} ${i + 1}`)).join("");
      w.document.write(`<!doctype html><html><head><title>${shopName} — ${L.tablesTitle}</title>${pageStyle}</head><body>${cards}</body></html>`);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 600);
    } catch {
      /* qrcode load failed */
    }
  }

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="shrink-0 self-center rounded-2xl border-4 border-orange-200 bg-white p-3 shadow-sm">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="QR menu code" className="h-40 w-40" />
          ) : (
            <div className="flex h-40 w-40 items-center justify-center text-slate-300">
              <QrCode className="h-10 w-10" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-orange-500" />
            <h3 className="text-lg font-bold text-slate-900">{L.title}</h3>
          </div>
          <p className="mt-2 text-sm text-slate-500">{L.desc}</p>
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
            <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate font-mono text-xs text-slate-600">{menuUrl}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={copyLink}>
              <Link2 className="h-4 w-4" /> {copied ? L.copied : L.copy}
            </Button>
            <Button variant="secondary" onClick={downloadQr} disabled={!qrDataUrl}>
              <Download className="h-4 w-4" /> {L.download}
            </Button>
            <Button onClick={printCard} disabled={!qrDataUrl}>
              <Printer className="h-4 w-4" /> {L.print}
            </Button>
          </div>

          {tablesOn && (
            <div className="mt-5 rounded-2xl bg-violet-50 p-4 ring-1 ring-violet-200">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4 text-violet-600" />
                <p className="text-sm font-bold text-violet-800">{L.tablesTitle}</p>
              </div>
              <p className="mt-1 text-xs text-violet-700">
                {L.table} 1 – {count} · {L.tablesDesc}
              </p>
              <Button variant="secondary" className="mt-3" onClick={printAllTables}>
                <Printer className="h-4 w-4" /> {L.printAll}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
