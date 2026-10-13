/**
 * WhatsApp deep-link helpers for the POS thank-you flow.
 * Pure client-side wa.me links — no API, no cost, no ban risk.
 */

/** ISO country → international dial code (covers every country in countries.ts + common extras). */
const DIAL_CODES: Record<string, string> = {
  PK: "92", US: "1", CA: "1", GB: "44", AE: "971", SA: "966", QA: "974",
  OM: "968", KW: "965", BH: "973", IN: "91", BD: "880", LK: "94", NP: "977",
  MY: "60", SG: "65", AU: "61", NZ: "64", DE: "49", FR: "33", IT: "39",
  ES: "34", NL: "31", BE: "32", PT: "351", IE: "353", SE: "46", NO: "47",
  DK: "45", FI: "358", TR: "90", EG: "20", ZA: "27", KE: "254", NG: "234",
  GH: "233", MA: "212", DZ: "213", TN: "216", JP: "81", KR: "82", CN: "86",
};

/**
 * Best-effort normalization of a cashier-typed phone number to wa.me digits.
 * "0300 1234567" + PK → "923001234567". Already-international numbers pass through.
 */
export function waNumber(phone: string, country?: string): string {
  let digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0") && country && DIAL_CODES[country]) {
    digits = DIAL_CODES[country] + digits.replace(/^0+/, "");
  } else if (digits.startsWith("0")) {
    digits = digits.replace(/^0+/, "");
  }
  return digits;
}

/**
 * The English thank-you message (global product → always English by design,
 * no matter the app's UI language).
 */
export function thankYouMessage(opts: {
  shop: string;
  orderNumber: string | number;
  total: string;
  menuLink: string;
}): string {
  const lines = [
    `Thank you for your order at ${opts.shop}! 🧾`,
    `Order ${opts.orderNumber} · ${opts.total}`,
  ];
  if (opts.menuLink) {
    lines.push("Hungry again? Order anytime from our online menu:", opts.menuLink);
  }
  return lines.join("\n");
}
