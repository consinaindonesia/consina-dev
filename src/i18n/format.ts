import type { Lang } from "@/i18n";

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
    return { value: String(primary), langUsed: lang };
  }
  const fallback = (row[`${base}_${other}` as keyof T] as unknown) as
    | string
    | null
    | undefined;
  if (fallback && String(fallback).trim()) {
    return { value: String(fallback), langUsed: other };
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