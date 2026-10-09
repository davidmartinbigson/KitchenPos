/**
 * Country → currency map used across signup, settings and the landing page.
 * The displayed symbol is what owners/staff see on POS, receipts, menus, etc.
 */

export type CountryInfo = {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  currencySymbol: string;
  currencyCode: string; // ISO 4217
};

export const COUNTRIES: CountryInfo[] = [
  { code: "PK", name: "Pakistan", currencySymbol: "Rs", currencyCode: "PKR" },
  { code: "US", name: "United States", currencySymbol: "$", currencyCode: "USD" },
  { code: "GB", name: "United Kingdom", currencySymbol: "£", currencyCode: "GBP" },
  { code: "AE", name: "United Arab Emirates", currencySymbol: "AED", currencyCode: "AED" },
  { code: "SA", name: "Saudi Arabia", currencySymbol: "SR", currencyCode: "SAR" },
  { code: "IN", name: "India", currencySymbol: "₹", currencyCode: "INR" },
  { code: "BD", name: "Bangladesh", currencySymbol: "৳", currencyCode: "BDT" },
  { code: "CA", name: "Canada", currencySymbol: "$", currencyCode: "CAD" },
  { code: "AU", name: "Australia", currencySymbol: "$", currencyCode: "AUD" },
  { code: "QA", name: "Qatar", currencySymbol: "QR", currencyCode: "QAR" },
  { code: "KW", name: "Kuwait", currencySymbol: "KD", currencyCode: "KWD" },
  { code: "OM", name: "Oman", currencySymbol: "RO", currencyCode: "OMR" },
  { code: "BH", name: "Bahrain", currencySymbol: "BD", currencyCode: "BHD" },
  { code: "TR", name: "Türkiye", currencySymbol: "₺", currencyCode: "TRY" },
  { code: "MY", name: "Malaysia", currencySymbol: "RM", currencyCode: "MYR" },
  { code: "ID", name: "Indonesia", currencySymbol: "Rp", currencyCode: "IDR" },
  { code: "SG", name: "Singapore", currencySymbol: "$", currencyCode: "SGD" },
  { code: "DE", name: "Germany", currencySymbol: "€", currencyCode: "EUR" },
  { code: "FR", name: "France", currencySymbol: "€", currencyCode: "EUR" },
  { code: "IT", name: "Italy", currencySymbol: "€", currencyCode: "EUR" },
  { code: "ES", name: "Spain", currencySymbol: "€", currencyCode: "EUR" },
  { code: "NL", name: "Netherlands", currencySymbol: "€", currencyCode: "EUR" },
  { code: "IE", name: "Ireland", currencySymbol: "€", currencyCode: "EUR" },
  { code: "PT", name: "Portugal", currencySymbol: "€", currencyCode: "EUR" },
  { code: "SE", name: "Sweden", currencySymbol: "kr", currencyCode: "SEK" },
  { code: "NO", name: "Norway", currencySymbol: "kr", currencyCode: "NOK" },
  { code: "DK", name: "Denmark", currencySymbol: "kr", currencyCode: "DKK" },
  { code: "CH", name: "Switzerland", currencySymbol: "CHF", currencyCode: "CHF" },
  { code: "ZA", name: "South Africa", currencySymbol: "R", currencyCode: "ZAR" },
  { code: "NG", name: "Nigeria", currencySymbol: "₦", currencyCode: "NGN" },
  { code: "EG", name: "Egypt", currencySymbol: "E£", currencyCode: "EGP" },
  { code: "JP", name: "Japan", currencySymbol: "¥", currencyCode: "JPY" },
  { code: "CN", name: "China", currencySymbol: "¥", currencyCode: "CNY" },
  { code: "KR", name: "South Korea", currencySymbol: "₩", currencyCode: "KRW" },
  { code: "BR", name: "Brazil", currencySymbol: "R$", currencyCode: "BRL" },
  { code: "MX", name: "Mexico", currencySymbol: "$", currencyCode: "MXN" },
  { code: "AF", name: "Afghanistan", currencySymbol: "؋", currencyCode: "AFN" },
  { code: "LK", name: "Sri Lanka", currencySymbol: "Rs", currencyCode: "LKR" },
  { code: "NP", name: "Nepal", currencySymbol: "Rs", currencyCode: "NPR" },
];

export const DEFAULT_COUNTRY = "PK";

export function isCountryCode(value: unknown): value is string {
  return typeof value === "string" && COUNTRIES.some((c) => c.code === value);
}

export function countryInfo(code: string | null | undefined): CountryInfo {
  return (
    COUNTRIES.find((c) => c.code === code) ??
    COUNTRIES.find((c) => c.code === DEFAULT_COUNTRY)!
  );
}

export function currencyForCountry(code: string | null | undefined): string {
  return countryInfo(code).currencySymbol;
}

/**
 * Best-effort visitor country from the browser locale
 * (e.g. "en-US" → US, "ur-PK" → PK, "en-GB" → GB). Defaults to Pakistan.
 */
export function detectCountryFromLocale(locale?: string): string {
  try {
    const resolved =
      locale ??
      (typeof navigator !== "undefined"
        ? navigator.language
        : Intl.DateTimeFormat().resolvedOptions().locale);
    const parts = String(resolved).replace("_", "-").split("-");
    const region = parts[parts.length - 1]?.toUpperCase();
    if (region && region.length === 2 && isCountryCode(region)) return region;
  } catch {
    /* fall through */
  }
  return DEFAULT_COUNTRY;
}
