import type { Lang } from "@/lib/i18n";

/** Prices are stored as whole currency units (integers). */
export function formatMoney(amount: number, currency = "Rs") {
  const rounded = Math.round(amount);
  const formatted = rounded.toLocaleString("en-US");
  return `${currency} ${formatted}`;
}

export function formatNumber(n: number, lang: Lang = "en") {
  const locale = lang === "ur" ? "ur-PK" : lang === "ar" ? "ar-AE-u-nu-latn" : "en-US";
  return n.toLocaleString(locale);
}

export function formatDate(value: string | Date, lang: Lang = "en") {
  const d = typeof value === "string" ? new Date(value) : value;
  const locale = lang === "ur" ? "ur-PK" : lang === "ar" ? "ar-AE" : "en-US";
  return d.toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(value: string | Date, lang: Lang = "en") {
  const d = typeof value === "string" ? new Date(value) : value;
  const localeTz = lang === "ur" ? "ur-PK" : lang === "ar" ? "ar-AE-u-nu-latn" : "en-US";
  return d.toLocaleTimeString(localeTz, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Local date as YYYY-MM-DD (uses the user's browser timezone). */
export function toLocalDateKey(value: string | Date = new Date()) {
  const d = typeof value === "string" ? new Date(value) : value;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Compress an uploaded image into a small JPEG data URL for storage. */
/**
 * Resize + re-encode an image for storage. Never returns more than
 * `maxDataChars` characters of data URL (~500KB by default) — quality is
 * stepped down automatically until it fits or we give up.
 */
export function compressImage(file: File, maxSize = 480, quality = 0.82, maxDataChars = 690_000): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Not an image"));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image"));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported"));
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        let q = quality;
        let out = canvas.toDataURL("image/jpeg", q);
        while (out.length > maxDataChars && q > 0.35) {
          q -= 0.12;
          out = canvas.toDataURL("image/jpeg", q);
        }
        if (out.length > maxDataChars) {
          reject(new Error("Image larger than 500KB"));
          return;
        }
        resolve(out);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
