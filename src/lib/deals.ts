/**
 * "Deal" items (Deal 1, Family Deal…) are bundles; their description lists the
 * contents. Show that contents text wherever the item travels: POS tiles, cart,
 * printed receipts (customer + counter), kitchen display and sales history.
 *
 * Detection: the item NAME contains the word "deal" (case-insensitive), exactly
 * as the owner names their deals. No DB changes needed — description already exists.
 */
const DEAL_RE = /\bdeal\b/i;

export function isDeal(name: string | null | undefined): boolean {
  return !!name && DEAL_RE.test(name);
}

/** Trimmed contents text for a deal item, or undefined when not applicable. */
export function dealContents(
  name: string | null | undefined,
  description: string | null | undefined,
): string | undefined {
  const d = (description ?? "").trim();
  return isDeal(name) && d ? d.slice(0, 180) : undefined;
}

/**
 * Compose the order-line note saved with each line item (kitchen + receipts read it):
 * deal contents first, then any staff-written note. "" when there is nothing.
 */
export function lineNote(
  name: string | null | undefined,
  description: string | null | undefined,
  userNote: string | null | undefined,
): string {
  const parts = [dealContents(name, description), (userNote ?? "").trim()].filter(Boolean);
  return parts.join(" · ").slice(0, 190);
}
