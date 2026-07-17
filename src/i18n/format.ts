import type { Lang } from "@/i18n";

export function normalizeEscapedLineBreaks(
  value: string | null | undefined,
  replacement = "\n",
): string {
  if (!value) return "";
  return String(value)
    .replace(/\r\n/g, "\n")
    .replace(/\s*\\n\s*/g, replacement)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Format a price in IDR. Always IDR; only the digit/grouping/prefix differs. */
export function formatPrice(amount: number, lang: Lang): string {
  if (lang === "id") {
    // "Rp 1.850.000"
    const n = new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: 0,
    }).format(amount);
    return `Rp ${n}`;
  }
  // "IDR 1,850,000"
  const n = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(amount);
  return `IDR ${n}`;
}

/** Format a date with the locale's standard medium format. */
export function formatDate(input: Date | string | number, lang: Lang): string {
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return "";
  const locale = lang === "id" ? "id-ID" : "en-US";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/**
 * Pick the localized text from a bilingual record like
 * `{ name_id, name_en }`. Falls back to the other language if the
 * requested one is empty. Returns the language actually used so callers
 * can show a "translation missing" hint when it differs from `lang`.
 */
export function localizedField<T extends Record<string, unknown>>(
  row: T | null | undefined,
  base: string,
  lang: Lang,
): { value: string; langUsed: Lang | null } {
  if (!row) return { value: "", langUsed: null };
  const other: Lang = lang === "id" ? "en" : "id";
  const primary = (row[`${base}_${lang}` as keyof T] as unknown) as
    | string
    | null
    | undefined;
  if (primary && String(primary).trim()) {
    return { value: normalizeEscapedLineBreaks(String(primary)), langUsed: lang };
  }
  const fallback = (row[`${base}_${other}` as keyof T] as unknown) as
    | string
    | null
    | undefined;
  if (fallback && String(fallback).trim()) {
    return { value: normalizeEscapedLineBreaks(String(fallback)), langUsed: other };
  }
  return { value: "", langUsed: null };
}

/**
 * True if the row has any non-empty translation for `base` in `lang`.
 * Useful to decide whether to show a "missing translation" banner.
 */
export function hasTranslation<T extends Record<string, unknown>>(
  row: T | null | undefined,
  bases: string[],
  lang: Lang,
): boolean {
  if (!row) return false;
  return bases.some((b) => {
    const v = row[`${b}_${lang}` as keyof T] as unknown;
    return typeof v === "string" && v.trim().length > 0;
  });
}

function normalizeLabelKey(value: string | null | undefined): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const CATEGORY_EN_LABELS: Record<string, string> = {
  accessories: "Accessories",
  activities: "Activities",
  "alat-masak": "Cookware",
  "alat-tidur": "Sleeping Gear",
  apparel: "Apparel",
  bags: "Bags",
  box: "Boxes",
  "20-40l": "20-40L",
  camping: "Camping",
  "camping-tools": "Camping Tools",
  carabiner: "Carabiners",
  "celana-panjang": "Long Pants",
  "celana-pendek": "Shorts",
  climbing: "Climbing",
  "diatas-40l": "Over 40L",
  dompet: "Wallets",
  expert: "Expert",
  "fly-sheet": "Fly Sheets",
  "frame-tent": "Frame Tents",
  gloves: "Gloves",
  "hand-bag": "Hand Bags",
  "head-lamp": "Headlamps",
  headlamp: "Headlamps",
  hydropack: "Hydration Packs",
  "ikat-waist": "Waist Belts",
  "jas-hujan": "Rainwear",
  jaket: "Jackets",
  "jaket-gunung": "Mountain Jackets",
  jam: "Watches",
  jersey: "Jerseys",
  kacamata: "Glasses",
  "kaos-kaki": "Socks",
  kursi: "Chairs",
  lampu: "Lamps",
  "light-softshell": "Light Softshell",
  manset: "Arm Sleeves",
  meja: "Tables",
  mug: "Mugs",
  "package-bags": "Package Bags",
  pillow: "Pillows",
  polo: "Polo Shirts",
  "polar-fleece": "Polar Fleece",
  "rain-coat": "Rain Coats",
  rak: "Racks",
  rompi: "Vests",
  sandal: "Sandals",
  senter: "Flashlights",
  sepatu: "Footwear",
  shirt: "Shirts",
  "shopping-bag": "Shopping Bags",
  "shoulder-bag": "Shoulder Bags",
  softshell: "Softshell",
  tali: "Ropes",
  "tas-laptop": "Laptop Bags",
  "tas-pinggang": "Waist Bags",
  technical: "Technical",
  tenda: "Tents",
  topi: "Hats",
  "travel-bag": "Travel Bags",
  "travel-organizer": "Travel Organizers",
  "travel-pouch": "Travel Pouches",
  "trekking-and-hiking": "Trekking & Hiking",
  "trekking-hiking": "Trekking & Hiking",
  "trekking-pole": "Trekking Poles",
  "t-shirt": "T-Shirts",
  "under-20l": "Under 20L",
  "dibawah-20l": "Under 20L",
  "water-bottle": "Water Bottles",
  woman: "Women",
};

const PRODUCT_EN_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bBUNDLING\b/gi, "Bundle"],
  [/\bDAN\b/gi, "and"],
  [/\bCELANA PANJANG\b/gi, "Long Pants"],
  [/\bCELANA PENDEK\b/gi, "Shorts"],
  [/\bDIBAWAH 20L\b/gi, "Under 20L"],
  [/\bDIATAS 40L\b/gi, "Over 40L"],
  [/\bJAKET GUNUNG\b/gi, "Mountain Jacket"],
  [/\bKAOS KAKI\b/gi, "Socks"],
  [/\bALAT MASAK\b/gi, "Cookware"],
  [/\bALAT TIDUR\b/gi, "Sleeping Gear"],
  [/\bMEJA LIPAT\b/gi, "Folding Table"],
  [/\bANTI SLIP\b/gi, "Anti-slip"],
  [/\bTAS PINGGANG\b/gi, "Waist Bag"],
  [/\bTAS LAPTOP\b/gi, "Laptop Bag"],
  [/\bTAS\b/gi, "Bag"],
  [/\bKURSI\b/gi, "Chair"],
  [/\bTENDA\b/gi, "Tent"],
  [/\bMEJA\b/gi, "Table"],
  [/\bSEPATU\b/gi, "Shoes"],
  [/\bSANDAL\b/gi, "Sandals"],
  [/\bSENTER\b/gi, "Flashlight"],
  [/\bLAMPU\b/gi, "Lamp"],
  [/\bJAKET\b/gi, "Jacket"],
  [/\bROMPI\b/gi, "Vest"],
  [/\bTOPI\b/gi, "Hat"],
  [/\bGUNUNG\b/gi, "Mountain"],
  [/\bOUTDOOR\b/gi, "Outdoor"],
  [/\bKARET\b/gi, "Rubber"],
  [/\bLIPAT\b/gi, "Folding"],
  [/\bRANSEL\b/gi, "Backpack"],
];

export function localizedCategoryName<T extends Record<string, unknown>>(
  row: T | null | undefined,
  lang: Lang,
): string {
  const fallback = localizedField(row, "name", lang).value;
  if (lang === "id") return fallback;
  const slug = typeof row?.slug === "string" ? row.slug : "";
  return CATEGORY_EN_LABELS[normalizeLabelKey(slug)] ?? CATEGORY_EN_LABELS[normalizeLabelKey(fallback)] ?? fallback;
}

export function localizedProductName<T extends Record<string, unknown>>(
  row: T | null | undefined,
  lang: Lang,
): string {
  let value = localizedField(row, "name", lang).value;
  if (lang === "id" || !value) return value;
  for (const [pattern, replacement] of PRODUCT_EN_REPLACEMENTS) {
    value = value.replace(pattern, replacement);
  }
  return value.replace(/\s{2,}/g, " ").trim();
}
