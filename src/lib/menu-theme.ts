/**
 * Per-shop QR menu theming: a color preset + layout picked in Settings,
 * applied to the public /menu/<slug> page. Class strings are FULL Tailwind
 * classes (never interpolated fragments) so the JIT picks them up.
 */

export const MENU_THEME_COLORS = ["orange", "blue", "emerald", "violet", "rose", "slate"] as const;
export type MenuThemeColor = (typeof MENU_THEME_COLORS)[number];

export const MENU_LAYOUTS = ["list", "grid"] as const;
export type MenuLayout = (typeof MENU_LAYOUTS)[number];

/**
 * Free-customizer layer (accent + page background + text tone) layered over a
 * preset. `enabled` flips the menu into true white-label mode.
 */
export type MenuCustom = { enabled: boolean; accent: string; bg: string; text: "dark" | "light" };
export const DEFAULT_MENU_CUSTOM: MenuCustom = { enabled: false, accent: "#ea580c", bg: "#fff7ed", text: "dark" };

export type MenuTheme = { color: MenuThemeColor; layout: MenuLayout; custom: MenuCustom };
export const DEFAULT_MENU_THEME: MenuTheme = { color: "orange", layout: "list", custom: { ...DEFAULT_MENU_CUSTOM } };

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
function sanitizeHex(v: unknown, fallback: string): string {
  const t = String(v ?? "").trim();
  return HEX_RE.test(t) ? t.toLowerCase() : fallback;
}

export const MENU_PALETTE: Record<
  MenuThemeColor,
  {
    /** Solid accent background (add/+/checkout buttons). */
    solid: string;
    /** Big button: solid + hover. */
    btnLg: string;
    /** Accent text (price, category counters). */
    accentText: string;
    /** Soft tinted surface (image tiles, minus buttons). */
    softBg: string;
    /** Soft card border. */
    softBorder: string;
    /** Ring for soft chips (extras). */
    ringSoft: string;
    /** Hover state of soft surface. */
    softHover: string;
    /** Active category chip. */
    chipOn: string;
    /** Inactive category chip. */
    chipOff: string;
    /** Brand gradient (logo tile, settings swatch). */
    tile: string;
    /** Page background wash. */
    pageBg: string;
    /** Human name (settings UI). */
    label: string;
  }
> = {
  orange: {
    solid: "bg-orange-600",
    btnLg: "bg-orange-600 hover:bg-orange-700",
    accentText: "text-orange-700",
    softBg: "bg-orange-100",
    softBorder: "border-orange-100",
    ringSoft: "ring-orange-200",
    softHover: "hover:bg-orange-200",
    chipOn: "bg-orange-600 text-white shadow-sm",
    chipOff: "bg-white text-slate-600 ring-1 ring-orange-200",
    tile: "from-orange-500 to-red-500",
    pageBg: "from-amber-50 to-orange-50",
    label: "Classic Orange",
  },
  blue: {
    solid: "bg-blue-600",
    btnLg: "bg-blue-600 hover:bg-blue-700",
    accentText: "text-blue-700",
    softBg: "bg-blue-100",
    softBorder: "border-blue-100",
    ringSoft: "ring-blue-200",
    softHover: "hover:bg-blue-200",
    chipOn: "bg-blue-600 text-white shadow-sm",
    chipOff: "bg-white text-slate-600 ring-1 ring-blue-200",
    tile: "from-blue-500 to-cyan-500",
    pageBg: "from-sky-50 to-blue-50",
    label: "Ocean Blue",
  },
  emerald: {
    solid: "bg-emerald-600",
    btnLg: "bg-emerald-600 hover:bg-emerald-700",
    accentText: "text-emerald-700",
    softBg: "bg-emerald-100",
    softBorder: "border-emerald-100",
    ringSoft: "ring-emerald-200",
    softHover: "hover:bg-emerald-200",
    chipOn: "bg-emerald-600 text-white shadow-sm",
    chipOff: "bg-white text-slate-600 ring-1 ring-emerald-200",
    tile: "from-emerald-500 to-teal-500",
    pageBg: "from-emerald-50 to-teal-50",
    label: "Fresh Green",
  },
  violet: {
    solid: "bg-violet-600",
    btnLg: "bg-violet-600 hover:bg-violet-700",
    accentText: "text-violet-700",
    softBg: "bg-violet-100",
    softBorder: "border-violet-100",
    ringSoft: "ring-violet-200",
    softHover: "hover:bg-violet-200",
    chipOn: "bg-violet-600 text-white shadow-sm",
    chipOff: "bg-white text-slate-600 ring-1 ring-violet-200",
    tile: "from-violet-500 to-purple-500",
    pageBg: "from-violet-50 to-purple-50",
    label: "Royal Purple",
  },
  rose: {
    solid: "bg-rose-600",
    btnLg: "bg-rose-600 hover:bg-rose-700",
    accentText: "text-rose-700",
    softBg: "bg-rose-100",
    softBorder: "border-rose-100",
    ringSoft: "ring-rose-200",
    softHover: "hover:bg-rose-200",
    chipOn: "bg-rose-600 text-white shadow-sm",
    chipOff: "bg-white text-slate-600 ring-1 ring-rose-200",
    tile: "from-rose-500 to-pink-500",
    pageBg: "from-rose-50 to-pink-50",
    label: "Berry Rose",
  },
  slate: {
    solid: "bg-slate-800",
    btnLg: "bg-slate-800 hover:bg-slate-900",
    accentText: "text-slate-800",
    softBg: "bg-slate-200",
    softBorder: "border-slate-200",
    ringSoft: "ring-slate-300",
    softHover: "hover:bg-slate-300",
    chipOn: "bg-slate-800 text-white shadow-sm",
    chipOff: "bg-white text-slate-600 ring-1 ring-slate-300",
    tile: "from-slate-600 to-slate-900",
    pageBg: "from-slate-100 to-slate-50",
    label: "Charcoal",
  },
};

export function sanitizeMenuCustom(raw: unknown): MenuCustom {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_MENU_CUSTOM };
  const o = raw as Record<string, unknown>;
  return {
    enabled: o.enabled === true,
    accent: sanitizeHex(o.accent, DEFAULT_MENU_CUSTOM.accent),
    bg: sanitizeHex(o.bg, DEFAULT_MENU_CUSTOM.bg),
    text: o.text === "light" ? "light" : "dark",
  };
}

export function parseMenuTheme(raw: unknown): MenuTheme {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_MENU_THEME, custom: { ...DEFAULT_MENU_CUSTOM } };
  const o = raw as Record<string, unknown>;
  const color = MENU_THEME_COLORS.includes(o.color as MenuThemeColor) ? (o.color as MenuThemeColor) : DEFAULT_MENU_THEME.color;
  const layout = MENU_LAYOUTS.includes(o.layout as MenuLayout) ? (o.layout as MenuLayout) : DEFAULT_MENU_THEME.layout;
  return { color, layout, custom: sanitizeMenuCustom(o.custom) };
}

/**
 * CSS-rule string for custom mode: the same token names as MENU_PALETTE,
 * implemented as classes reading CSS variables injected on <main>.
 * Color mixes keep hover/tints consistent for ANY picked color.
 */
export const CUSTOM_THEME_CSS = `
.m-solid{background:var(--m-accent);color:#fff}
.m-btnLg{background:var(--m-accent);color:#fff}
.m-btnLg:hover{background:color-mix(in srgb,var(--m-accent) 85%,#000)}
.m-accentText{color:var(--m-accent)}
.m-softBg{background:color-mix(in srgb,var(--m-accent) 12%,#fff)}
.m-softBorder{border-color:color-mix(in srgb,var(--m-accent) 16%,#fff)}
.m-chipOn{background:var(--m-accent);color:#fff;box-shadow:0 1px 2px rgb(0 0 0/.15)}
.m-chipOff{background:#fff;color:var(--m-accent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--m-accent) 25%,#fff)}
.m-ringSoft{--tw-ring-color:color-mix(in srgb,var(--m-accent) 25%,#fff)}
.m-softHover:hover{background:color-mix(in srgb,var(--m-accent) 22%,#fff)}
.m-tile{background:linear-gradient(135deg,var(--m-accent),color-mix(in srgb,var(--m-accent) 55%,#000))}
.m-page{background:linear-gradient(180deg,var(--m-bg),color-mix(in srgb,var(--m-bg) 60%,#fff))}
.m-heroText{color:var(--m-text)}
`;

/** Same shape as MENU_PALETTE entries, but class-only m-* utilities. */
export const CUSTOM_PALETTE = {
  solid: "m-solid",
  btnLg: "m-btnLg",
  accentText: "m-accentText",
  softBg: "m-softBg",
  softBorder: "m-softBorder",
  ringSoft: "m-ringSoft",
  softHover: "m-softHover",
  chipOn: "m-chipOn",
  chipOff: "m-chipOff",
  tile: "m-tile",
  pageBg: "m-page",
} as const;
