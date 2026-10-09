/** Minimal RFC4180-style CSV parser (handles quotes, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  // Strip UTF-8 BOM so the first header isn't corrupted.
  const input = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === "," || char === ";" || char === "\t") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char === "\r") {
      // ignore, handled by \n
    } else {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export type ImportRow = {
  name: string;
  price: string;
  category: string;
  description: string;
  emoji: string;
  available: string;
  image: string;
};

const HEADER_ALIASES: Record<keyof ImportRow, string[]> = {
  name: ["name", "item", "item name", "product", "title", "dish", "نام"],
  price: ["price", "rate", "amount", "cost", "قیمت"],
  category: ["category", "type", "group", "کیٹگری"],
  description: ["description", "details", "desc", "تفصیل"],
  emoji: ["emoji", "icon"],
  available: ["available", "active", "in stock", "status"],
  image: ["image", "image url", "picture", "photo", "img", "تصویر"],
};

function matchHeader(header: string): keyof ImportRow | null {
  const clean = header.trim().toLowerCase().replace(/[_-]+/g, " ");
  for (const key of Object.keys(HEADER_ALIASES) as (keyof ImportRow)[]) {
    if (HEADER_ALIASES[key].includes(clean)) return key;
  }
  return null;
}

export type ParsedSheet = {
  rows: ImportRow[];
  headers: string[];
  /** Rows that will be rejected by the server (missing name or bad price). */
  invalidCount: number;
};

/** Converts raw CSV text into normalized import rows using a flexible header map. */
export function parseMenuSheet(text: string): ParsedSheet {
  const table = parseCsv(text);
  if (table.length === 0) return { rows: [], headers: [], invalidCount: 0 };

  const headerCells = table[0].map((h) => h.trim());
  const mapping = headerCells.map(matchHeader);
  const recognized = mapping.filter(Boolean).length;

  // If the first line has no recognizable header, treat it as data: name,price,category
  const hasHeader = recognized >= 1;
  const dataRows = hasHeader ? table.slice(1) : table;
  const effectiveMapping: (keyof ImportRow | null)[] = hasHeader
    ? mapping
    : ["name", "price", "category", "description", "emoji", "available", "image"];

  const rows: ImportRow[] = [];
  let invalidCount = 0;

  for (const cells of dataRows) {
    const row: ImportRow = {
      name: "",
      price: "",
      category: "",
      description: "",
      emoji: "",
      available: "",
      image: "",
    };
    cells.forEach((cell, index) => {
      const key = effectiveMapping[index];
      if (key) row[key] = cell.trim();
    });

    if (!isValidImportRow(row)) invalidCount++;
    rows.push(row);
  }

  return { rows, headers: hasHeader ? headerCells : [], invalidCount };
}

/** Mirrors the server's price parsing so the preview matches the import result. */
export function parseSheetPrice(value: string) {
  const raw = String(value ?? "").trim();
  if (!raw || !/\d/.test(raw)) return NaN;
  const num = Number(raw.replace(/[^\d.-]/g, ""));
  return Number.isFinite(num) ? Math.round(num) : NaN;
}

export function isValidImportRow(row: ImportRow) {
  const price = parseSheetPrice(row.price);
  return Boolean(row.name.trim()) && Number.isFinite(price) && price >= 0;
}

export const CSV_TEMPLATE = `name,price,category,description,emoji,available,image
Chicken Karahi,1200,Main course,Spicy and served with naan,🍛,yes,
Zinger Burger,450,Fast food,Crispy fillet with mayo,🍔,yes,
Naan,40,Bread,Fresh from the tandoor,🫓,yes,
Cold Drink,120,Drinks,Chilled 345ml can,🥤,yes,
`;
