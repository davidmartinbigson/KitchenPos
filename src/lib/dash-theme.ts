/** Dashboard white-label accent (owner picks brand colors; OFF by default). */

export type DashTheme = {
  enabled: boolean;
  accent: string;
  /** Gradient tail color (the rose part of brand gradients). */
  tail: string;
};

export const DEFAULT_DASH_THEME: DashTheme = {
  enabled: false,
  accent: "#ea580c",
  tail: "#f43f5e",
};

/** Curated accent→tail pairs (set both at once). */
export const DASH_PRESETS: { accent: string; tail: string; label: string }[] = [
  { accent: "#ea580c", tail: "#f43f5e", label: "Ember (default)" },
  { accent: "#2563eb", tail: "#7c3aed", label: "Ocean" },
  { accent: "#059669", tail: "#0ea5e9", label: "Fresh" },
  { accent: "#7c3aed", tail: "#e11d48", label: "Royal" },
  { accent: "#e11d48", tail: "#f97316", label: "Cherry" },
  { accent: "#0f172a", tail: "#4338ca", label: "Midnight" },
];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function parseDashTheme(v: unknown): DashTheme {
  if (!v || typeof v !== "object") return { ...DEFAULT_DASH_THEME };
  const o = v as Record<string, unknown>;
  const accent = typeof o.accent === "string" && HEX_RE.test(o.accent) ? o.accent : DEFAULT_DASH_THEME.accent;
  const tail = typeof o.tail === "string" && HEX_RE.test(o.tail) ? o.tail : DEFAULT_DASH_THEME.tail;
  return { enabled: o.enabled === true, accent, tail };
}
