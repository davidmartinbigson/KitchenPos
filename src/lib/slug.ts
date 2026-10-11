/**
 * Vanity menu URL slugs: /menu/<slug> mirrors what the 0009_menu_slug
 * backfill does in SQL (lowercase, non [a-z0-9] -> "-", trim "-").
 * New signups are always suffixed with the numeric id so they stay unique
 * without an extra existence check.
 */
export function slugifyShopName(shopName: string): string {
  const base = shopName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "shop";
}

export function signupSlug(shopName: string, userId: number): string {
  return `${slugifyShopName(shopName)}-${userId}`;
}

/** Safe slug param check — anything else 404s before hitting the DB. */
export function isValidSlugParam(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 140;
}
