import type { Lang } from "./config";

const UI_LABEL_FALLBACKS: Record<Lang, Record<string, string>> = {
  id: {
    "about": "Tentang",
    "all stores": "Semua toko",
    "catalog": "Katalog",
    "cerita": "Cerita",
    "contact": "Kontak",
    "explore": "Jelajahi",
    "explore collection": "Lihat Koleksi",
    "explore the collection": "Lihat Koleksi",
    "find a store": "Cari Toko",
    "find store": "Cari Toko",
    "home": "Beranda",
    "jelajahi": "Jelajahi",
    "jelajahi koleksi": "Lihat Koleksi",
    "learn more": "Pelajari",
    "learn more about us": "Pelajari lebih lanjut",
    "lihat koleksi": "Lihat Koleksi",
    "shop": "Belanja",
    "shop now": "Belanja Sekarang",
    "stores": "Toko",
    "story": "Cerita",
    "toko": "Toko",
    "view all": "Lihat semua",
  },
  en: {
    "about": "About",
    "all stores": "All stores",
    "belanja": "Shop",
    "belanja sekarang": "Shop Now",
    "catalog": "Catalog",
    "cari toko": "Find a Store",
    "cerita": "Story",
    "contact": "Contact",
    "explore": "Explore",
    "explore collection": "Explore Collection",
    "explore the collection": "Explore Collection",
    "find a store": "Find a Store",
    "home": "Home",
    "jelajahi": "Explore",
    "jelajahi koleksi": "Explore Collection",
    "katalog": "Catalog",
    "pelajari": "Learn more",
    "pelajari lebih lanjut": "Learn more",
    "lihat koleksi": "Explore Collection",
    "lihat semua": "View all",
    "shop": "Shop",
    "shop now": "Shop Now",
    "stores": "Stores",
    "story": "Story",
    "toko": "Stores",
  },
};

export function normalizeUiLabel(value: string | undefined | null, lang: string): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  const targetLang: Lang = lang === "en" ? "en" : "id";
  const normalized = trimmed.toLowerCase().replace(/\s+/g, " ");
  return UI_LABEL_FALLBACKS[targetLang][normalized] ?? trimmed;
}
