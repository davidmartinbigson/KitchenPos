/**
 * White-label DASHBOARD accent. When enabled, the owner's workspace (app shell,
 * POS, dashboard, sales…) recolours its orange brand scale from a single hex.
 * Implemented by overriding Tailwind v4's --color-orange-* tokens inside a
 * [data-accent] wrapper — no class refactors, works for ANY hex via color-mix.
 */

export type DashTheme = { enabled: boolean; accent: string };
export const DEFAULT_DASH_THEME: DashTheme = { enabled: false, accent: "#ea580c" };

export const DASH_PRESETS = [
  { hex: "#ea580c", label: "Classic Orange" },
  { hex: "#2563eb", label: "Ocean Blue" },
  { hex: "#059669", label: "Fresh Green" },
  { hex: "#7c3aed", label: "Royal Purple" },
  { hex: "#e11d48", label: "Berry Rose" },
  { hex: "#0f172a", label: "Charcoal" },
] as const;

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function parseDashTheme(raw: unknown): DashTheme {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_DASH_THEME };
  const o = raw as Record<string, unknown>;
  const acc = String(o.accent ?? "").trim();
  return {
    enabled: o.enabled === true,
    accent: HEX_RE.test(acc) ? acc.toLowerCase() : DEFAULT_DASH_THEME.accent,
  };
}
