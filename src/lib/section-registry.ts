// Section registry: metadata-only. Component map lives in src/routes/index.tsx
// so that the actual section JSX stays co-located with its dependencies and
// this file is safe to import from admin code.

export type SectionTypeId =
  | "hero"
  | "brand_story"
  | "categories"
  | "featured_products"
  | "community"
  | "store_locator"
  | "faq"
  | "contact";

export type SectionDefinition = {
  id: SectionTypeId;
  label: string;
  description: string;
  defaultSettings: Record<string, unknown>;
};

export const SECTION_REGISTRY: Record<SectionTypeId, SectionDefinition> = {
  hero: {
    id: "hero",
    label: "Hero",
    description: "Full-bleed hero with headline and call to action.",
    defaultSettings: {},
  },
  brand_story: {
    id: "brand_story",
    label: "Brand Story",
    description: "Cerita Kami — origin story and brand pillars.",
    defaultSettings: {},
  },
  categories: {
    id: "categories",
    label: "Shop by Category",
    description: "Horizontal carousel of product categories.",
    defaultSettings: {},
  },
  featured_products: {
    id: "featured_products",
    label: "Bestsellers",
    description: "Featured products carousel.",
    defaultSettings: {},
  },
  community: {
    id: "community",
    label: "Community",
    description: "Responsible Trekker community block.",
    defaultSettings: {},
  },
  store_locator: {
    id: "store_locator",
    label: "Store Locator",
    description: "Find a Consina store across Indonesia.",
    defaultSettings: {},
  },
  faq: {
    id: "faq",
    label: "FAQ",
    description: "Frequently asked questions accordion.",
    defaultSettings: {},
  },
  contact: {
    id: "contact",
    label: "Contact",
    description: "Contact form and details.",
    defaultSettings: {},
  },
};

// Default homepage composition. Used as fallback when no DB rows exist,
// so the live site keeps rendering even if the section engine is empty.
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