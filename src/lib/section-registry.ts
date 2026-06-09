// Section registry: metadata + default settings.
// Per-section components consume `SectionSettings[type]` and fall back to
// these defaults so the live site keeps rendering identically when DB rows
// have empty settings.

export type SectionTypeId =
  | "hero"
  | "brand_story"
  | "categories"
  | "featured_products"
  | "community"
  | "store_locator"
  | "faq"
  | "contact"
  | "stats";

export type Localized = { id?: string; en?: string };

export type CTAConfig = {
  labelId?: string;
  labelEn?: string;
  href?: string;
  style?: "primary" | "secondary" | "outline";
};

export type SectionStyle = {
  bgColor?: string; // CSS color, "" / undefined => default
  textColor?: string;
  padding?: "S" | "M" | "L"; // default "M"
};

export type StatItem = { value: string; labelId?: string; labelEn?: string };

export type HeroSettings = {
  style?: SectionStyle;
  image?: string;
  overlay?: number; // 0..100
  eyebrow?: Localized;
  heading?: Localized; // supports {em} inline tag
  subtitle?: Localized;
  ctaPrimary?: CTAConfig;
  ctaSecondary?: CTAConfig;
  stats?: StatItem[];
};

export type FeaturedProductsSettings = {
  style?: SectionStyle;
  title?: Localized;
  subtitle?: Localized;
  source?: "featured" | "manual";
  productIds?: string[];
  count?: number;
};

export type CategoriesSettings = {
  style?: SectionStyle;
  title?: Localized;
  subtitle?: Localized;
  categorySlugs?: string[]; // ordered; empty => auto from DB
};

export type BrandStorySettings = {
  style?: SectionStyle;
  image?: string;
  eyebrow?: Localized;
  heading?: Localized;
  bodyId?: string;
  bodyEn?: string;
  cta?: CTAConfig;
};

export type CommunitySettings = {
  style?: SectionStyle;
  image?: string;
  imageSide?: "left" | "right";
  eyebrow?: Localized;
  heading?: Localized;
  bodyId?: string;
  bodyEn?: string;
  cta?: CTAConfig;
};

export type StatsSettings = {
  style?: SectionStyle;
  items?: StatItem[];
};

export type GenericSettings = { style?: SectionStyle };

export type SectionSettingsMap = {
  hero: HeroSettings;
  brand_story: BrandStorySettings;
  categories: CategoriesSettings;
  featured_products: FeaturedProductsSettings;
  community: CommunitySettings;
  store_locator: GenericSettings;
  faq: GenericSettings;
  contact: GenericSettings;
  stats: StatsSettings;
};

export type AnySectionSettings = SectionSettingsMap[SectionTypeId];

export type SectionDefinition = {
  id: SectionTypeId;
  label: string;
  description: string;
};

export const SECTION_REGISTRY: Record<SectionTypeId, SectionDefinition> = {
  hero: { id: "hero", label: "Hero", description: "Full-bleed hero with headline and call to action." },
  brand_story: { id: "brand_story", label: "Brand Story", description: "Cerita Kami — origin story and brand pillars." },
  categories: { id: "categories", label: "Shop by Category", description: "Horizontal carousel of product categories." },
  featured_products: { id: "featured_products", label: "Bestsellers", description: "Featured products carousel." },
  community: { id: "community", label: "Community", description: "Image + text block." },
  store_locator: { id: "store_locator", label: "Store Locator", description: "Find a Consina store across Indonesia." },
  faq: { id: "faq", label: "FAQ", description: "Frequently asked questions accordion." },
  contact: { id: "contact", label: "Contact", description: "Contact form and details." },
  stats: { id: "stats", label: "Stats", description: "A row of number + label pairs." },
};

export const DEFAULT_HOME_SECTIONS: SectionTypeId[] = [
  "hero",
  "brand_story",
  "categories",
  "featured_products",
  "community",
  "store_locator",
  "faq",
  "contact",
];

export const SECTION_TYPE_LIST: SectionDefinition[] = Object.values(SECTION_REGISTRY);

export type PageSectionRow = {
  id: string;
  page: string;
  section_type: string;
  position: number;
  enabled: boolean;
  settings: Record<string, unknown> | null;
};

// ---------- Default settings (seeded from current homepage content) ----------

export const DEFAULT_HERO: HeroSettings = {
  style: { padding: "M" },
  image: "/src/assets/hero-mountain.jpg",
  overlay: 40,
  eyebrow: { id: "Gaya Hidup Outdoor — Sejak 1999", en: "The Outdoor Lifestyle — Est. 1999" },
  heading: {
    id: "Terinspirasi Oleh {em}Pengalaman{/em}\nDibangun untuk Nusantara.",
    en: "Inspired By {em}Experience{/em}\nBuilt for the archipelago.",
  },
  subtitle: {
    id: "Perlengkapan untuk pendaki, penjelajah, pemanjat, dan pelari yang menjadikan Indonesia sebagai medan bermain — dirancang di Jakarta, diuji di setiap pulau.",
    en: "Gear for hikers, campers, climbers and runners who call Indonesia their playground — designed in Jakarta, tested on every island.",
  },
  ctaPrimary: { labelId: "Jelajahi Koleksi", labelEn: "Explore the collection", href: "/catalog", style: "primary" },
  ctaSecondary: { labelId: "Cari Toko", labelEn: "Find a Store", href: "/stores", style: "outline" },
  stats: [
    { value: "25+", labelId: "Tahun di jalur pendakian", labelEn: "Years on the trail" },
    { value: "150+", labelId: "Toko di seluruh Indonesia", labelEn: "Stores across Indonesia" },
    { value: "100%", labelId: "Buatan dalam negeri", labelEn: "Locally crafted" },
  ],
};

export const DEFAULT_FEATURED_PRODUCTS: FeaturedProductsSettings = {
  style: { padding: "M" },
  title: { id: "Favorit yang Teruji di Jalur", en: "Trail-Tested Favorites" },
  subtitle: { id: "Terlaris", en: "Bestsellers" },
  source: "featured",
  count: 8,
};

export const DEFAULT_CATEGORIES: CategoriesSettings = {
  style: { padding: "M" },
  title: { id: "Belanja per Kategori", en: "Shop by Category" },
  subtitle: { id: "Dibuat untuk setiap petualangan, dibuat di Indonesia", en: "Built for every adventure, made in Indonesia" },
  categorySlugs: [],
};

export const DEFAULT_BRAND_STORY: BrandStorySettings = {
  style: { padding: "M" },
  image: "/src/assets/story-hiker.jpg",
  eyebrow: { id: "Cerita Kami", en: "Our Story" },
  heading: { id: "Terinspirasi dari Pengalaman", en: "Inspired by Experience" },
  bodyId:
    "Sejak 1999, Consina menjadi merek gaya hidup outdoor Indonesia — lahir di Jakarta, dibangun untuk para penjelajah.\n\nSetiap produk kami dibentuk oleh masukan komunitas pendaki, penjelajah, dan pemanjat. Kami tidak hanya merancang perlengkapan — kami merancang dari pengalaman nyata.\n\nHari ini, komunitas 'Responsible Trekker' kami tersebar di seluruh nusantara, dengan satu keyakinan: tinggalkan jalur lebih baik dari saat Anda menemukannya.",
  bodyEn:
    "Since 1999, Consina has been Indonesia's outdoor lifestyle brand — born in Jakarta, built for adventurers.\n\nEvery product we make is shaped by feedback from our community of hikers, campers, and climbers. We don't just design gear — we design from lived experience.\n\nToday, our 'Responsible Trekker' community spans the entire archipelago, sharing one belief: leave the trail better than you found it.",
  cta: { labelId: "Pelajari lebih lanjut", labelEn: "Learn more about us", href: "/", style: "primary" },
};

export const DEFAULT_COMMUNITY: CommunitySettings = {
  style: { padding: "M", bgColor: "#1a3a2e", textColor: "#ffffff" },
  image: "/src/assets/community-cleanup.jpg",
  imageSide: "right",
  eyebrow: { id: "Komunitas Kami", en: "Our Community" },
  heading: { id: "The Responsible Trekker", en: "The Responsible Trekker" },
  bodyId:
    "Kami percaya petualangan outdoor dan kepedulian lingkungan tidak dapat dipisahkan. Itulah mengapa komunitas pendaki, pemanjat, dan penjelajah kami memegang satu janji: tinggalkan jalur lebih baik dari saat Anda menemukannya.\n\nBergabunglah dengan ribuan penjelajah Indonesia yang memilih perlengkapan yang menghormati gunung-gunung yang mereka cintai.",
  bodyEn:
    "We believe outdoor adventure and environmental care are inseparable. That's why our community of hikers, climbers, and campers carry one promise: leave the trail better than you found it.\n\nJoin thousands of Indonesian adventurers who choose gear that respects the mountains they love.",
  cta: { labelId: "Gabung Komunitas", labelEn: "Join the Community", href: "/", style: "secondary" },
};

export const DEFAULT_STATS: StatsSettings = {
  style: { padding: "M" },
  items: DEFAULT_HERO.stats!,
};

export const DEFAULT_SECTION_SETTINGS: { [K in SectionTypeId]: SectionSettingsMap[K] } = {
  hero: DEFAULT_HERO,
  brand_story: DEFAULT_BRAND_STORY,
  categories: DEFAULT_CATEGORIES,
  featured_products: DEFAULT_FEATURED_PRODUCTS,
  community: DEFAULT_COMMUNITY,
  store_locator: { style: { padding: "M" } },
  faq: { style: { padding: "M" } },
  contact: { style: { padding: "M" } },
  stats: DEFAULT_STATS,
};

export function getDefaultSettings<K extends SectionTypeId>(type: K): SectionSettingsMap[K] {
  return DEFAULT_SECTION_SETTINGS[type];
}

// Merge a partial settings object stored in DB with the defaults for a type.
export function mergeSettings<K extends SectionTypeId>(
  type: K,
  partial: unknown,
): SectionSettingsMap[K] {
  const def = DEFAULT_SECTION_SETTINGS[type] as Record<string, unknown>;
  const p = (partial ?? {}) as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...def, ...p };
  // shallow merge nested style
  merged.style = { ...(def.style ?? {}), ...((p.style as object) ?? {}) };
  return merged as SectionSettingsMap[K];
}

// Helpers
export function pickLocalized(
  loc: Localized | undefined,
  lang: string,
  fallback = "",
): string {
  if (!loc) return fallback;
  const primary = lang === "en" ? loc.en : loc.id;
  return (primary ?? loc.en ?? loc.id ?? fallback) || fallback;
}

export function styleToProps(style: SectionStyle | undefined): {
  className: string;
  inlineStyle: React.CSSProperties;
} {
  const padding = style?.padding ?? "M";
  const padClass =
    padding === "S"
      ? "py-4 md:py-6 lg:py-10"
      : padding === "L"
        ? "py-12 md:py-20 lg:py-28"
        : "py-8 md:py-12 lg:py-20";
  const inlineStyle: React.CSSProperties = {};
  if (style?.bgColor) inlineStyle.backgroundColor = style.bgColor;
  if (style?.textColor) inlineStyle.color = style.textColor;
  return { className: padClass, inlineStyle };
}