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
  | "stats"
  | "faq_custom"
  | "newsletter"
  | "image_banner"
  | "gallery"
  | "testimonials"
  | "spacer"
  | "announcement_bar"
  | "custom";

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
  // Optional per-text overrides. When unset the section uses its theme defaults.
  eyebrowColor?: string;
  headingColor?: string;
  bodyColor?: string;
  ctaTextColor?: string;
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
  eyebrow?: Localized;
  categorySlugs?: string[]; // ordered; empty => auto from DB
  // Per-category image override. mode "manual" + src uses the uploaded image,
  // "auto" (default) uses the newest product image (falls back to the bundled default).
  categoryImages?: Record<string, { mode?: "auto" | "manual"; src?: string }>;
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

export type StoreItem = { city: string; address: string; phone: string };
export type StoreLocatorSettings = {
  style?: SectionStyle;
  eyebrow?: Localized;
  title?: Localized;
  subtitle?: Localized;
  cta?: CTAConfig;
  stores?: StoreItem[];
};

export type FaqSettings = {
  style?: SectionStyle;
  eyebrow?: Localized;
  title?: Localized;
  subtitle?: Localized;
  items?: FaqItem[];
};

export type ContactSettings = {
  style?: SectionStyle;
  eyebrow?: Localized;
  title?: Localized;
  subtitle?: Localized;
  email?: string;
  phone?: string;
  address?: string;
  contacts?: ContactPerson[];
};

export type ContactPerson = {
  name?: string;
  phone?: string;
  role?: string;
  email?: string;
};

export type FaqItem = { questionId?: string; questionEn?: string; answerId?: string; answerEn?: string };
export type FaqCustomSettings = {
  style?: SectionStyle;
  eyebrow?: Localized;
  title?: Localized;
  subtitle?: Localized;
  items?: FaqItem[];
};

export type NewsletterSettings = {
  style?: SectionStyle;
  eyebrow?: Localized;
  heading?: Localized;
  body?: Localized;
  placeholder?: Localized;
  buttonLabel?: Localized;
  successMessage?: Localized;
};

export type ImageBannerSettings = {
  style?: SectionStyle;
  image?: string;
  overlay?: number; // 0..100
  alignment?: "left" | "center" | "right";
  eyebrow?: Localized;
  heading?: Localized;
  body?: Localized;
  cta?: CTAConfig;
  height?: "S" | "M" | "L";
};

export type GalleryImage = { src: string; alt?: string; href?: string };
export type GallerySettings = {
  style?: SectionStyle;
  title?: Localized;
  subtitle?: Localized;
  columns?: 2 | 3 | 4;
  images?: GalleryImage[];
};

export type TestimonialItem = {
  quoteId?: string;
  quoteEn?: string;
  author?: string;
  role?: string;
  avatar?: string;
  rating?: number; // 1..5
};
export type TestimonialsSettings = {
  style?: SectionStyle;
  eyebrow?: Localized;
  title?: Localized;
  items?: TestimonialItem[];
};

export type SpacerSettings = {
  style?: SectionStyle;
  height?: number; // px
  showDivider?: boolean;
};

export type AnnouncementBarSettings = {
  style?: SectionStyle;
  message?: Localized;
  linkLabel?: Localized;
  href?: string;
  bgColor?: string;
  textColor?: string;
};

export type CustomSectionSettings = {
  style?: SectionStyle;
  image?: string;
  imagePosition?: "left" | "right" | "background";
  imageHref?: string;
  overlay?: number; // 0..100 — only used when imagePosition === "background"
  eyebrow?: Localized;
  heading?: Localized;
  body?: Localized;
  cta?: CTAConfig;
};

export type SectionSettingsMap = {
  hero: HeroSettings;
  brand_story: BrandStorySettings;
  categories: CategoriesSettings;
  featured_products: FeaturedProductsSettings;
  community: CommunitySettings;
  store_locator: StoreLocatorSettings;
  faq: FaqSettings;
  contact: ContactSettings;
  stats: StatsSettings;
  faq_custom: FaqCustomSettings;
  newsletter: NewsletterSettings;
  image_banner: ImageBannerSettings;
  gallery: GallerySettings;
  testimonials: TestimonialsSettings;
  spacer: SpacerSettings;
  announcement_bar: AnnouncementBarSettings;
  custom: CustomSectionSettings;
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
  store_locator: { id: "store_locator", label: "Stores (Toko)", description: "Find a Consina store across Indonesia." },
  faq: { id: "faq", label: "FAQ", description: "Frequently asked questions accordion." },
  contact: { id: "contact", label: "Contact (Hubungi Kami)", description: "Contact form and details." },
  stats: { id: "stats", label: "Stats", description: "A row of number + label pairs." },
  faq_custom: { id: "faq_custom", label: "FAQ (custom)", description: "Reusable FAQ block with your own Q&A pairs." },
  newsletter: { id: "newsletter", label: "Newsletter Signup", description: "Collect emails to your subscriber list." },
  image_banner: { id: "image_banner", label: "Image Banner / Promo", description: "Image-led promo banner with heading + CTA." },
  gallery: { id: "gallery", label: "Gallery / Image Grid", description: "Grid of curated images." },
  testimonials: { id: "testimonials", label: "Testimonials", description: "Customer quotes and reviews." },
  spacer: { id: "spacer", label: "Spacer / Divider", description: "Adjustable empty space with optional divider." },
  announcement_bar: { id: "announcement_bar", label: "Announcement Bar", description: "Slim message bar — place at top of the page." },
  custom: { id: "custom", label: "Custom Section", description: "Blank section with image + eyebrow + heading + description + CTA." },
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
  image: "",
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
  eyebrow: { id: "Koleksi", en: "Collections" },
  categorySlugs: [],
};

export const DEFAULT_BRAND_STORY: BrandStorySettings = {
  style: { padding: "M" },
  image: "",
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
  image: "",
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

export const DEFAULT_FAQ_CUSTOM: FaqCustomSettings = {
  style: { padding: "M" },
  eyebrow: { id: "FAQ", en: "FAQ" },
  title: { id: "Pertanyaan yang Sering Diajukan", en: "Frequently Asked Questions" },
  subtitle: { id: "Tidak menemukan jawaban? Hubungi kami.", en: "Can't find the answer? Reach out to us." },
  items: [
    {
      questionId: "Apa itu Consina?",
      questionEn: "What is Consina?",
      answerId: "Consina adalah merek perlengkapan outdoor Indonesia sejak 1999.",
      answerEn: "Consina is an Indonesian outdoor gear brand since 1999.",
    },
  ],
};

export const DEFAULT_NEWSLETTER: NewsletterSettings = {
  style: { padding: "M", bgColor: "#f5efe6" },
  eyebrow: { id: "Buletin", en: "Newsletter" },
  heading: { id: "Tetap di Jalur", en: "Stay on the trail" },
  body: {
    id: "Dapatkan info produk baru, kisah komunitas, dan promo musiman.",
    en: "Get new product drops, community stories, and seasonal offers.",
  },
  placeholder: { id: "Alamat email Anda", en: "Your email address" },
  buttonLabel: { id: "Berlangganan", en: "Subscribe" },
  successMessage: { id: "Terima kasih sudah berlangganan!", en: "Thanks for subscribing!" },
};

export const DEFAULT_IMAGE_BANNER: ImageBannerSettings = {
  style: { padding: "M" },
  image: "",
  overlay: 35,
  alignment: "center",
  eyebrow: { id: "Promo Musiman", en: "Seasonal Promo" },
  heading: { id: "Petualangan Baru Menanti", en: "New Adventures Await" },
  body: { id: "Diskon hingga 25% untuk koleksi terpilih.", en: "Up to 25% off selected gear." },
  cta: { labelId: "Belanja Sekarang", labelEn: "Shop now", href: "/catalog", style: "primary" },
  height: "M",
};

export const DEFAULT_GALLERY: GallerySettings = {
  style: { padding: "M" },
  title: { id: "Galeri", en: "Gallery" },
  subtitle: { id: "Momen dari komunitas kami", en: "Moments from our community" },
  columns: 3,
  images: [],
};

export const DEFAULT_TESTIMONIALS: TestimonialsSettings = {
  style: { padding: "M" },
  eyebrow: { id: "Ulasan", en: "Reviews" },
  title: { id: "Apa kata para penjelajah", en: "What adventurers say" },
  items: [
    {
      quoteId: "Ransel Consina menemani saya ke puncak Rinjani — nyaman dan tangguh.",
      quoteEn: "My Consina pack carried me to Rinjani's summit — comfortable and tough.",
      author: "Andi P.",
      role: "Pendaki, Bandung",
      rating: 5,
    },
    {
      quoteId: "Kualitas tenda luar biasa untuk harganya.",
      quoteEn: "Tent quality is outstanding for the price.",
      author: "Rina S.",
      role: "Penjelajah, Jakarta",
      rating: 5,
    },
  ],
};

export const DEFAULT_SPACER: SpacerSettings = {
  style: { padding: "S" },
  height: 48,
  showDivider: false,
};

export const DEFAULT_ANNOUNCEMENT_BAR: AnnouncementBarSettings = {
  style: { padding: "S" },
  message: { id: "Gratis ongkir untuk pembelian di atas Rp 500.000", en: "Free shipping on orders over Rp 500,000" },
  linkLabel: { id: "Pelajari", en: "Learn more" },
  href: "/",
  bgColor: "#1a3a2e",
  textColor: "#ffffff",
};

export const DEFAULT_SECTION_SETTINGS: { [K in SectionTypeId]: SectionSettingsMap[K] } = {
  hero: DEFAULT_HERO,
  brand_story: DEFAULT_BRAND_STORY,
  categories: DEFAULT_CATEGORIES,
  featured_products: DEFAULT_FEATURED_PRODUCTS,
  community: DEFAULT_COMMUNITY,
  store_locator: {
    style: { padding: "M" },
    eyebrow: { id: "Toko", en: "Stores" },
    title: { id: "Temukan toko Consina terdekat", en: "Find a Consina store near you" },
    subtitle: {
      id: "Lebih dari 80 toko di seluruh Indonesia — datang, coba langsung, dan temui tim kami.",
      en: "More than 80 stores across Indonesia — come visit, try gear in person, and meet our team.",
    },
    cta: { labelId: "Lihat semua toko", labelEn: "View all stores", href: "/stores", style: "primary" },
    stores: [
      { city: "Jakarta", address: "Pasar Baru Flagship", phone: "+62 21 345 6789" },
      { city: "Bandung", address: "Jl. Sumatera No. 17", phone: "+62 22 723 1144" },
      { city: "Yogyakarta", address: "Jl. Mangkubumi 22", phone: "+62 274 555 020" },
      { city: "Bali", address: "Denpasar — Jl. Teuku Umar", phone: "+62 361 224 998" },
    ],
  },
  faq: {
    style: { padding: "M" },
    eyebrow: { id: "FAQ", en: "FAQ" },
    title: { id: "Pertanyaan yang Sering Diajukan", en: "Frequently Asked Questions" },
    subtitle: { id: "Tidak menemukan jawaban? Hubungi kami.", en: "Can't find the answer? Reach out to us." },
    items: [],
  },
  contact: {
    style: { padding: "M" },
    eyebrow: { id: "Hubungi Kami", en: "Contact" },
    title: { id: "Mari bicara.", en: "Let's talk." },
    subtitle: {
      id: "Pertanyaan tentang produk, kerja sama, atau peluang karir? Tim kami siap membantu.",
      en: "Questions about products, partnerships, or careers? Our team is here to help.",
    },
    email: "hello@consina.com",
    phone: "+62 21 345 6789",
    address: "Jakarta, Indonesia",
  },
  stats: DEFAULT_STATS,
  faq_custom: DEFAULT_FAQ_CUSTOM,
  newsletter: DEFAULT_NEWSLETTER,
  image_banner: DEFAULT_IMAGE_BANNER,
  gallery: DEFAULT_GALLERY,
  testimonials: DEFAULT_TESTIMONIALS,
  spacer: DEFAULT_SPACER,
  announcement_bar: DEFAULT_ANNOUNCEMENT_BAR,
  custom: {
    style: { padding: "M" },
    image: "",
    imagePosition: "right",
    overlay: 35,
    eyebrow: { id: "", en: "" },
    heading: { id: "Bagian Kustom", en: "Custom Section" },
    body: {
      id: "Tulis deskripsi singkat di sini.",
      en: "Write a short description here.",
    },
    cta: { labelId: "", labelEn: "", href: "", style: "primary" },
  },
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
  inlineStyle: Record<string, string>;
} {
  const padding = style?.padding ?? "M";
  const padClass =
    padding === "S"
      ? "py-4 md:py-6 lg:py-10"
      : padding === "L"
        ? "py-12 md:py-20 lg:py-28"
        : "py-8 md:py-12 lg:py-20";
  const inlineStyle: Record<string, string> = {};
  if (style?.bgColor) inlineStyle.backgroundColor = style.bgColor;
  if (style?.textColor) inlineStyle.color = style.textColor;
  return { className: padClass, inlineStyle };
}