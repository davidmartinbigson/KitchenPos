/**
 * Custom payment methods for the payments add-on.
 *
 * Global product rule: every shop starts with just two choices — the always
 * built-in "cash" plus one neutral "online-payment". Owners then add their
 * own merchant names (Stripe, PayPal, JazzCash, Vodafone Cash, ...) in
 * Settings, because payment brands are country-specific.
 */

export const DEFAULT_PAYMENT_METHODS = ["online-payment"];

const MAX_METHODS = 8;
const MAX_LEN = 24;

/** Dedupe + sanitize a raw list (jsonb value, JSON string, or array from an API body). */
export function normalizePaymentMethods(raw: unknown): string[] {
  let list: unknown = raw;
  if (typeof raw === "string") {
    try {
      list = JSON.parse(raw);
    } catch {
      list = [];
    }
  }
  if (!Array.isArray(list)) return [];
  const out: string[] = [];
  for (const v of list) {
    const s = String(v ?? "").trim().slice(0, MAX_LEN);
    if (!s) continue;
    if (s.toLowerCase() === "cash") continue; // cash is built-in, never stored
    if (out.some((x) => x.toLowerCase() === s.toLowerCase())) continue;
    out.push(s);
    if (out.length >= MAX_METHODS) break;
  }
  return out;
}

/** Everything the POS should offer as chips: cash first, then the owner's list. */
export function paymentChips(raw: unknown): string[] {
  const custom = normalizePaymentMethods(raw);
  return ["cash", ...(custom.length ? custom : [...DEFAULT_PAYMENT_METHODS])];
}

/** Slug comparison for order POST validation (case-insensitive). */
export function matchPaymentMethod(rawList: unknown, candidate: string): string | null {
  const c = candidate.trim().toLowerCase();
  if (!c || c.length > MAX_LEN) return null;
  if (c === "cash") return "cash";
  if (c === "online-payment") return "online-payment";
  for (const m of normalizePaymentMethods(rawList)) {
    if (m.toLowerCase() === c) return m; // return the owner's own spelling
  }
  return null;
}
