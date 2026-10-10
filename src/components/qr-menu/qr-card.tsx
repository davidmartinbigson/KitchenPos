"use client";

import { useEffect, useState } from "react";
import { QrCode, Link2, Download, Printer } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { useI18n } from "@/components/providers/language-provider";

export function QrMenuCard({ restaurantId, shopName }: { restaurantId: number; shopName: string }) {
  const { lang } = useI18n();
  const [menuUrl, setMenuUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);

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

  function printCard() {
    if (!qrDataUrl) return;
    const w = window.open("", "_blank", "width=520,height=700");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>${shopName} — QR Menu</title>
<style>
  body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff}
  .card{border:3px solid #f97316;border-radius:28px;padding:36px;text-align:center;max-width:380px}
  .qr{width:280px;height:280px;margin:16px auto}
  h1{margin:0;font-size:26px;color:#0f172a}
  p{margin:8px 0 0;color:#64748b;font-size:14px}
  .badge{display:inline-block;margin-top:18px;background:#f97316;color:#fff;font-weight:700;padding:10px 22px;border-radius:999px;font-size:15px}
</style></head><body>
<div class="card">
  <h1>${shopName}</h1>
  <p>Order from your table — no app needed</p>
  <img class="qr" src="${qrDataUrl}" alt="Menu QR code" />
  <p>Point your phone camera at the code</p>
  <div class="badge">${L.scan}</div>
</div></body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
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
        </div>
      </div>
    </Card>
  );
}
