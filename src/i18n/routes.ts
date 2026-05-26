import type { Lang } from "@/i18n";

/**
 * Canonical source of truth for localized URL slugs.
 * `path` is the slug PAST the language prefix (no leading slash).
 * Use "" for the home (so the URL is exactly /id or /en).
 */
export type PageKey =
  | "home"
  | "catalog"
  | "stores"
  | "carriers"
  | "tents"
  | "apparel"
  | "footwear"
  | "accessories"
  | "category"; // dynamic: /<prefix>/<slug>

type Entry = {
  id: string;
  en: string;
  /** True if the slug is a prefix that takes a trailing path segment (e.g. /kategori/<slug>). */
  dynamic?: boolean;
};

export const PAGES: Record<PageKey, Entry> = {
  home: { id: "", en: "" },
  catalog: { id: "katalog", en: "catalog" },
  stores: { id: "toko", en: "stores" },
  carriers: { id: "kategori/carriers", en: "categories/carriers" },
  tents: { id: "kategori/tents", en: "categories/tents" },
  apparel: { id: "kategori/apparel", en: "categories/apparel" },
  footwear: { id: "kategori/footwear", en: "categories/footwear" },
  accessories: { id: "kategori/accessories", en: "categories/accessories" },
  category: { id: "kategori", en: "categories", dynamic: true },
};

export function localizedPath(
  key: PageKey,
  lang: Lang,
  params?: { slug?: string },
): string {
  const entry = PAGES[key];
  const slug = entry[lang];
  const base = `/${lang}${slug ? `/${slug}` : ""}`;
  if (entry.dynamic && params?.slug) return `${base}/${params.slug}`;
  return base;
}

export type ResolvedRoute = {
  lang: Lang;
  key: PageKey;
  params: { slug?: string };
};

/**
 * Parse any pathname (e.g. "/id/kategori/carriers", "/en/catalog", "/")
 * and return the resolved page or null if it doesn't match a localized route.
 */
export function parseLocalizedPath(pathname: string): ResolvedRoute | null {
  const clean = pathname.replace(/\/+$/g, "") || "/";
  const parts = clean.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  const lang = parts[0];
  if (lang !== "id" && lang !== "en") return null;
  const rest = parts.slice(1).join("/");
  if (rest === "") return { lang, key: "home", params: {} };

  // Match static entries first (longest path wins)
  const candidates: Array<{ key: PageKey; path: string }> = [];
  for (const [k, entry] of Object.entries(PAGES) as Array<[PageKey, Entry]>) {
    if (entry.dynamic) continue;
    if (entry[lang] && entry[lang] === rest) {
      candidates.push({ key: k, path: entry[lang] });
    }
  }
  if (candidates.length) {
    candidates.sort((a, b) => b.path.length - a.path.length);
    return { lang, key: candidates[0].key, params: {} };
  }

  // Dynamic: <prefix>/<slug>
  for (const [k, entry] of Object.entries(PAGES) as Array<[PageKey, Entry]>) {
    if (!entry.dynamic) continue;
    const prefix = entry[lang];
    if (rest === prefix) continue;
    if (rest.startsWith(prefix + "/")) {
      const slug = rest.slice(prefix.length + 1);
      if (slug && !slug.includes("/")) {
        return { lang, key: k, params: { slug } };
      }
    }
  }

  return null;
}

/**
 * Given an unprefixed legacy path like "/catalog" or "/c/carriers",
 * find the best matching localized path for the target language.
 */
export function legacyToLocalized(pathname: string, lang: Lang): string | null {
  const clean = pathname.replace(/^\/+|\/+$/g, "");
  if (!clean) return `/${lang}`;

  // Legacy /c/<slug> -> /<lang>/<category-prefix>/<slug>
  if (clean.startsWith("c/")) {
    const slug = clean.slice(2);
    if (slug && !slug.includes("/")) {
      return localizedPath("category", lang, { slug });
    }
  }

  // Map known legacy English slugs to page keys
  const legacyMap: Record<string, PageKey> = {
    catalog: "catalog",
    stores: "stores",
    carriers: "carriers",
    tents: "tents",
    apparel: "apparel",
    footwear: "footwear",
    accessories: "accessories",
  };
  if (legacyMap[clean]) return localizedPath(legacyMap[clean], lang);

  return null;
}

export function detectBrowserLang(acceptLanguage?: string | null): Lang {
  if (!acceptLanguage) return "id";
  const first = acceptLanguage.split(",")[0]?.trim().toLowerCase() ?? "";
  if (first.startsWith("id")) return "id";
  if (first.startsWith("en")) return "en";
  // Fallback: scan list
  const tags = acceptLanguage.toLowerCase().split(",").map((s) => s.trim().split(";")[0]);
  for (const tag of tags) {
    if (tag.startsWith("id")) return "id";
    if (tag.startsWith("en")) return "en";
  }
  return "id";
}
