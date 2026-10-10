/**
 * Opt-in add-ons: every extra feature is off by default so the base system
 * stays simple. Owners enable them from Settings → Add-ons.
 */
export const ADDON_KEYS = [
  "discounts",
  "payments",
  "stock",
  "voids",
  "modifiers",
  "tables",
  "cashShift",
  "profit",
  "whatsappCustomer",
] as const;

export type AddonKey = (typeof ADDON_KEYS)[number];
export type AddonsMap = Partial<Record<AddonKey, boolean>>;

/** Add-ons that are live in production. Others stay hidden from Settings for now. */
export const READY_ADDONS: AddonKey[] = ["discounts", "payments", "stock", "voids"];

export const ORDER_PAYMENT_METHODS = ["cash", "card", "jazzcash", "easypaisa", "bank"] as const;

export function parseAddons(raw: unknown): AddonsMap {
  if (!raw || typeof raw !== "object") return {};
  const out: AddonsMap = {};
  for (const key of ADDON_KEYS) {
    if ((raw as Record<string, unknown>)[key] === true) out[key] = true;
  }
  return out;
}

export function addonEnabled(raw: unknown, key: AddonKey): boolean {
  return parseAddons(raw)[key] === true;
}

/** Merge a PATCH body { key: boolean } into the stored addons object, ignoring unknown keys. */
export function mergeAddons(raw: unknown, patch: unknown): AddonsMap {
  const current = parseAddons(raw);
  if (!patch || typeof patch !== "object") return current;
  for (const key of ADDON_KEYS) {
    const v = (patch as Record<string, unknown>)[key];
    if (typeof v === "boolean") current[key] = v;
    if (v === false) delete current[key];
  }
  return current;
}
