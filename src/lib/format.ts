import type { Lang } from "@/lib/i18n";

/** Prices are stored as whole currency units (integers). */
export function formatMoney(amount: number, currency = "Rs") {
  const rounded = Math.round(amount);
  const formatted = rounded.toLocaleString("en-US");
  return `${currency} ${formatted}`;
}

export function formatNumber(n: number, lang: Lang = "en") {
  return n.toLocaleString(lang === "ur" ? "ur-PK" : "en-US");
}

export function formatDate(value: string | Date, lang: Lang = "en") {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString(lang === "ur" ? "ur-PK" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(value: string | Date, lang: Lang = "en") {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleTimeString(lang === "ur" ? "ur-PK" : "en-US", {
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
export function compressImage(file: File, maxSize = 480, quality = 0.82): Promise<string> {
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
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
