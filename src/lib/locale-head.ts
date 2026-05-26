import type { Lang } from "@/i18n";
import { localizedPath, type PageKey } from "@/i18n/routes";

const SITE_URL = "https://draft.consina.cloud";

const META: Record<PageKey, { id: { title: string; description: string }; en: { title: string; description: string } }> = {
  home: {
    id: { title: "Consina — Gaya Hidup Outdoor | Perlengkapan Outdoor Indonesia Sejak 1999", description: "Perlengkapan outdoor Indonesia sejak 1999 — carrier, tenda, apparel, sepatu, dan aksesori." },
    en: { title: "Consina — The Outdoor Lifestyle | Indonesian Outdoor Gear Since 1999", description: "Indonesian outdoor gear since 1999 — carriers, tents, apparel, footwear and accessories." },
  },
  catalog: {
    id: { title: "Katalog — Perlengkapan Outdoor Consina", description: "Jelajahi seluruh katalog Consina dengan harga promo." },
    en: { title: "Catalog — Consina Outdoor Gear", description: "Browse the full Consina catalog with promo prices." },
  },
  stores: {
    id: { title: "Cari Toko Consina — 80+ Lokasi di Indonesia", description: "Temukan toko Consina terdekat di seluruh Indonesia." },
    en: { title: "Find a Consina Store — 80+ Locations Across Indonesia", description: "Find a Consina store near you across Indonesia." },
  },
  carriers: {
    id: { title: "Carrier & Tas Hiking 40L–100L | Consina", description: "Tas hiking Consina untuk pendakian, trekking, dan ekspedisi." },
    en: { title: "Hiking Carriers & Backpacks 40L–100L | Consina", description: "Consina backpacks built for Indonesian adventures." },
  },
  tents: {
    id: { title: "Tenda & Shelter | Consina", description: "Tenda Consina untuk camping solo, keluarga, dan ekspedisi." },
    en: { title: "Tents & Shelters | Consina", description: "Consina tents for solo, family, and expedition camping." },
  },
  apparel: {
    id: { title: "Apparel Outdoor — Jaket & Celana | Consina", description: "Apparel outdoor Consina untuk petualangan di alam terbuka." },
    en: { title: "Outdoor Apparel — Jackets & Pants | Consina", description: "Consina outdoor apparel for trail adventures." },
  },
  footwear: {
    id: { title: "Sepatu Hiking & Trail | Consina", description: "Sepatu Consina untuk medan tropis Indonesia." },
    en: { title: "Hiking & Trail Footwear | Consina", description: "Consina footwear built for Indonesian terrain." },
  },
  accessories: {
    id: { title: "Aksesori Outdoor | Consina", description: "Aksesori outdoor Consina untuk melengkapi kit petualangan." },
    en: { title: "Outdoor Accessories | Consina", description: "Consina outdoor accessories to round out your kit." },
  },
  category: {
    id: { title: "Kategori — Consina", description: "Jelajahi produk Consina berdasarkan kategori." },
    en: { title: "Category — Consina", description: "Browse Consina products by category." },
  },
  product: {
    id: { title: "Produk — Consina", description: "Detail produk Consina." },
    en: { title: "Product — Consina", description: "Consina product details." },
  },
};

export function buildHead(key: PageKey, lang: Lang, params?: { slug?: string }) {
  const m = META[key][lang];
  const otherLang: Lang = lang === "id" ? "en" : "id";
  const url = `${SITE_URL}${localizedPath(key, lang, params)}`;
  const otherUrl = `${SITE_URL}${localizedPath(key, otherLang, params)}`;
  return {
    meta: [
      { title: m.title },
      { name: "description", content: m.description },
      { property: "og:title", content: m.title },
      { property: "og:description", content: m.description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { property: "og:locale", content: lang === "id" ? "id_ID" : "en_US" },
    ],
    links: [
      { rel: "canonical", href: url },
      { rel: "alternate", hrefLang: lang, href: url },
      { rel: "alternate", hrefLang: otherLang, href: otherUrl },
      { rel: "alternate", hrefLang: "x-default", href: `${SITE_URL}${localizedPath(key, "id", params)}` },
    ],
  };
}
