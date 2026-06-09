import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, MapPin, Mountain, Leaf, Users, Mail, Phone, ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { usePublicProducts, type PublicProduct, getSiteUrl } from "@/lib/public-products";
import { usePublicCategories, type PublicCategory } from "@/hooks/use-public-categories";
import { useLang } from "@/i18n/LangProvider";
import { formatPrice, localizedField } from "@/i18n/format";
import { PriceDisplay } from "@/components/site/PriceDisplay";
import {
  DEFAULT_HOME_SECTIONS,
  SECTION_REGISTRY,
  mergeSettings,
  pickLocalized,
  styleToProps,
  type AnySectionSettings,
  type BrandStorySettings,
  type CategoriesSettings,
  type CommunitySettings,
  type FeaturedProductsSettings,
  type HeroSettings,
  type StatsSettings,
  type CTAConfig,
  type PageSectionRow,
  type SectionTypeId,
  type FaqCustomSettings,
  type NewsletterSettings,
  type ImageBannerSettings,
  type GallerySettings,
  type TestimonialsSettings,
  type SpacerSettings,
  type AnnouncementBarSettings,
} from "@/lib/section-registry";
import hero from "@/assets/hero-mountain.jpg";
import catCarriers from "@/assets/cat-carriers.jpg";
import catTents from "@/assets/cat-tents.jpg";
import catApparel from "@/assets/cat-apparel.jpg";
import catFootwear from "@/assets/cat-footwear.jpg";
import catAccessories from "@/assets/cat-accessories.jpg";
import story from "@/assets/story.jpg";
import communityCleanup from "@/assets/community-cleanup.jpg";
import storyHiker from "@/assets/story-hiker.jpg";
const SITE_URL = getSiteUrl();

const faqs = [
  {
    q: "What does Consina sell?",
    a: "Consina sells outdoor gear designed for Indonesian adventurers: backpack carriers (35L–100L), tents and shelters, technical apparel like jackets and pants, hiking footwear, and outdoor accessories such as bottles, headlamps, and trekking poles.",
  },
  {
    q: "Where is Consina based?",
    a: "Consina is headquartered in Jakarta, Indonesia, and has been designing outdoor gear in the country since 1999.",
  },
  {
    q: "Are Consina products made in Indonesia?",
    a: "Yes. Consina products are designed in Jakarta and locally crafted in Indonesia, then tested on trails across the archipelago.",
  },
  {
    q: "How can I find a Consina store near me?",
    a: "Consina operates more than 80 retail stores across Indonesia. You can use the Store Locator at /stores to search by city, province, or region — from Jakarta to Bali, Sumatra to Sulawesi.",
  },
  {
    q: "Does Consina have a community program?",
    a: "Yes. The 'Responsible Trekker' community brings together hikers, climbers, and campers across Indonesia who share one promise: leave the trail better than you found it.",
  },
];

const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Consina",
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.ico`,
  foundingDate: "1999",
  description:
    "Indonesian outdoor lifestyle brand designing carriers, tents, apparel, footwear and accessories since 1999.",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Jakarta",
    addressCountry: "ID",
  },
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "hello@consina.com",
      telephone: "+62-21-345-6789",
      areaServed: "ID",
    },
  ],
  sameAs: [
    "https://www.instagram.com/consinaindonesia",
    "https://www.facebook.com/consinaindonesia",
  ],
};

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Consina — The Outdoor Lifestyle | Indonesian Outdoor Gear Since 1999" },
      {
        name: "description",
        content: "Indonesian outdoor gear since 1999 — carriers, tents, apparel, footwear and accessories built for the archipelago's adventurers.",
      },
      { property: "og:title", content: "Consina — The Outdoor Lifestyle" },
      { property: "og:description", content: "Indonesian outdoor gear since 1999. Inspired by experience." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/` },
      { property: "og:image", content: `${SITE_URL}${hero}` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(organizationLd) },
      { type: "application/ld+json", children: JSON.stringify(faqLd) },
    ],
  }),
  component: HomePage,
});

const categories = [
  { name: "Carriers", slug: "carriers", desc: "Backpacks 40–100L for every adventure", img: catCarriers },
  { name: "Tents & Shelter", slug: "tents", desc: "From solo overnighters to group expeditions", img: catTents },
  { name: "Apparel", slug: "apparel", desc: "Jackets, pants, and shirts for the trail", img: catApparel },
  { name: "Footwear", slug: "footwear", desc: "Trekking shoes built for Indonesian terrain", img: catFootwear },
  { name: "Accessories", slug: "accessories", desc: "Bottles, headlamps, compasses, and more", img: catAccessories },
] as const;

const stores = [
  { city: "Jakarta", addr: "Pasar Baru Flagship", phone: "+62 21 345 6789" },
  { city: "Bandung", addr: "Jl. Sumatera No. 17", phone: "+62 22 723 1144" },
  { city: "Yogyakarta", addr: "Jl. Mangkubumi 22", phone: "+62 274 555 020" },
  { city: "Bali", addr: "Denpasar — Jl. Teuku Umar", phone: "+62 361 224 998" },
];

export function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        <ComposedSections />
      </main>
      <Footer />
    </div>
  );
}

// Map registry IDs to the actual section components defined below. Each
// accepts a `settings` prop typed via SectionSettingsMap; defaults are merged
// in by `mergeSettings` before render.
type SectionCmp = (props: { settings: AnySectionSettings }) => React.JSX.Element;
const SECTION_COMPONENTS: Record<SectionTypeId, SectionCmp> = {
  hero: Hero as SectionCmp,
  brand_story: BrandStory as SectionCmp,
  categories: Categories as SectionCmp,
  featured_products: FeaturedProducts as SectionCmp,
  community: Community as SectionCmp,
  store_locator: StoreLocator as SectionCmp,
  faq: FAQSection as SectionCmp,
  contact: ContactSection as SectionCmp,
  stats: StatsSection as SectionCmp,
  faq_custom: FaqCustomSection as SectionCmp,
  newsletter: NewsletterSection as SectionCmp,
  image_banner: ImageBannerSection as SectionCmp,
  gallery: GallerySection as SectionCmp,
  testimonials: TestimonialsSection as SectionCmp,
  spacer: SpacerSection as SectionCmp,
  announcement_bar: AnnouncementBarSection as SectionCmp,
};

function ComposedSections() {
  const [rows, setRows] = useState<PageSectionRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("page_sections")
        .select("id,page,section_type,position,enabled,settings")
        .eq("page", "home")
        .eq("enabled", true)
        .order("position", { ascending: true });
      if (cancelled) return;
      if (error || !data || data.length === 0) {
        setRows([]);
      } else {
        setRows(data as PageSectionRow[]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // While loading, render defaults so first paint matches existing site.
  const order: { key: string; type: SectionTypeId; settings: unknown }[] =
    rows === null || rows.length === 0
      ? DEFAULT_HOME_SECTIONS.map((t) => ({ key: t, type: t, settings: {} }))
      : rows
          .filter((r): r is PageSectionRow & { section_type: SectionTypeId } =>
            (r.section_type as SectionTypeId) in SECTION_REGISTRY,
          )
          .map((r) => ({
            key: r.id,
            type: r.section_type as SectionTypeId,
            settings: r.settings ?? {},
          }));

  return (
    <>
      {order.map(({ key, type, settings }) => {
        const Comp = SECTION_COMPONENTS[type];
        if (!Comp) return null;
        const merged = mergeSettings(type, settings);
        return <Comp key={key} settings={merged} />;
      })}
    </>
  );
}

/* ---------- Hero ---------- */
function Hero({ settings }: { settings: HeroSettings }) {
  const lang = useLang();
  const s = settings;
  const heroImg = s.image && s.image.trim() ? s.image : hero;
  const overlayPct = Math.max(0, Math.min(100, s.overlay ?? 40));
  const heading = pickLocalized(s.heading, lang);
  const eyebrow = pickLocalized(s.eyebrow, lang);
  const subtitle = pickLocalized(s.subtitle, lang);
  // Heading supports {em}…{/em} for highlighted span and \n for line break.
  const headingParts = heading.split(/\{em\}|\{\/em\}/);
  return (
    <section
      className="relative isolate overflow-hidden"
      style={s.style?.bgColor ? { backgroundColor: s.style.bgColor } : undefined}
    >
      <div className="absolute inset-0 -z-10">
        <img
          src={heroImg}
          alt="Hero background"
          width={1920}
          height={1080}
          className="h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, rgba(26,58,46,${(overlayPct / 100).toFixed(2)}), rgba(26,58,46,${((overlayPct * 0.75) / 100).toFixed(2)}), var(--background))`,
          }}
        />
      </div>
      <div
        className="mx-auto flex min-h-[88vh] max-w-[1280px] flex-col justify-end px-4 pb-8 pt-32 md:px-8 md:pb-12 lg:pb-16"
        style={s.style?.textColor ? { color: s.style.textColor } : undefined}
      >
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">{eyebrow}</p>
        )}
        <h1 className="mt-5 max-w-4xl font-[Archivo] text-5xl font-black leading-[0.95] tracking-tight text-primary-foreground md:text-7xl lg:text-[88px]">
          {headingParts.map((part, i) =>
            i % 2 === 1 ? (
              <em key={i} className="not-italic text-accent">{part}</em>
            ) : (
              <span key={i}>{part.split("\n").map((ln, j) => (
                <span key={j}>{j > 0 && <br />}{ln}</span>
              ))}</span>
            ),
          )}
        </h1>
        {subtitle && (
          <p className="mt-6 max-w-xl text-base leading-relaxed text-primary-foreground/85 md:text-lg">
            {subtitle}
          </p>
        )}
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <CTAButton cta={s.ctaPrimary} lang={lang} defaultStyle="primary" iconRight />
          <CTAButton cta={s.ctaSecondary} lang={lang} defaultStyle="outline" />
        </div>
        {s.stats && s.stats.length > 0 && (
          <div className="mt-16 grid max-w-2xl grid-cols-3 gap-6 border-t border-primary-foreground/20 pt-6 text-[#1a3a2e]">
            {s.stats.map((st, i) => (
              <div key={i}>
                <div className="font-[Archivo] text-2xl font-bold text-[#1a3a2e] md:text-3xl">{st.value}</div>
                <div className="mt-1 text-[11px] uppercase tracking-widest text-[#1a3a2e]">
                  {pickLocalized({ id: st.labelId, en: st.labelEn }, lang)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- CTA helper ---------- */
function CTAButton({
  cta,
  lang,
  defaultStyle = "primary",
  iconRight,
}: {
  cta?: CTAConfig;
  lang: string;
  defaultStyle?: "primary" | "secondary" | "outline";
  iconRight?: boolean;
}) {
  if (!cta) return null;
  const label = pickLocalized({ id: cta.labelId, en: cta.labelEn }, lang);
  if (!label) return null;
  const href = cta.href || "/";
  const style = cta.style ?? defaultStyle;
  const base = "group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-wider transition";
  const cls =
    style === "primary"
      ? `${base} bg-accent text-accent-foreground hover:bg-accent/90`
      : style === "secondary"
        ? `${base} bg-[#d4b896] text-[#1a3a2e] hover:bg-[#c9a84c]`
        : `${base} border border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10`;
  return (
    <a href={href} className={cls}>
      {label}
      {iconRight && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
    </a>
  );
}

/* ---------- Brand Story ---------- */
function BrandStory({ settings }: { settings: BrandStorySettings }) {
  const lang = useLang();
  const s = settings;
  const [expanded, setExpanded] = useState(false);
  const textWrapRef = useRef<HTMLDivElement>(null);
  const styleProps = styleToProps(s.style);

  const body = (lang === "en" ? s.bodyEn : s.bodyId) || s.bodyEn || s.bodyId || "";
  const paragraphs = body.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);

  const handleToggle = () => {
    if (expanded && textWrapRef.current) {
      textWrapRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    setExpanded((v) => !v);
  };

  return (
    <section
      className={`mx-auto max-w-[1280px] px-4 md:px-8 ${styleProps.className}`}
      style={styleProps.inlineStyle}
    >
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        {/* LEFT COLUMN — Image */}
        <div className="order-1">
          <div className="overflow-hidden rounded-2xl">
            <img
              src={s.image && s.image.trim() ? s.image : storyHiker}
              alt="Hiker on an Indonesian mountain trail"
              width={1024}
              height={1280}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        {/* RIGHT COLUMN — Text */}
        <div className="order-2" ref={textWrapRef}>
          {pickLocalized(s.eyebrow, lang) && (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
              {pickLocalized(s.eyebrow, lang)}
            </p>
          )}
          <h2 className="mt-4 font-[Archivo] text-4xl font-black leading-[1.05] tracking-tight text-primary md:text-5xl">
            {pickLocalized(s.heading, lang)}
          </h2>

          <div className="relative mt-6 md:mt-8">
            {/* Constrained width for comfortable reading */}
            <div className="max-w-prose">
              {/* Always-visible first paragraph */}
              <p className="text-base leading-[1.75] text-foreground/80 md:text-lg">
                {paragraphs[0] ?? ""}
              </p>

              {/* Collapsible remaining paragraphs */}
              <div
                className="grid transition-[grid-template-rows] duration-500 ease-out"
                style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="mt-5 space-y-5 text-base leading-[1.75] text-foreground/80 md:text-lg">
                    {paragraphs.slice(1).map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Fade gradient when collapsed */}
              {!expanded && (
                <div
                  className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 transition-opacity duration-300"
                  style={{
                    background:
                      "linear-gradient(to bottom, transparent, var(--background))",
                  }}
                />
              )}
            </div>

            {/* Toggle */}
            <button
              type="button"
              onClick={handleToggle}
              aria-expanded={expanded}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-primary/20 px-5 py-2.5 text-sm font-semibold uppercase tracking-wider text-primary transition hover:bg-primary/5 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              {expanded ? (
                <>
                  Lebih Sedikit <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  Lebih Detail <ChevronDown className="h-4 w-4" />
                </>
              )}
            </button>
          </div>

          {s.cta && pickLocalized({ id: s.cta.labelId, en: s.cta.labelEn }, lang) && (
            <a
              href={s.cta.href || "/"}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground transition hover:bg-secondary"
            >
              {pickLocalized({ id: s.cta.labelId, en: s.cta.labelEn }, lang)}{" "}
              <span className="text-base">→</span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- Categories ---------- */
const CATEGORY_IMAGE_MAP: Record<string, string> = {
  carriers: catCarriers,
  "tas-carrier": catCarriers,
  tents: catTents,
  tenda: catTents,
  apparel: catApparel,
  pakaian: catApparel,
  footwear: catFootwear,
  "alas-kaki": catFootwear,
  accessories: catAccessories,
  aksesori: catAccessories,
  daypack: catCarriers,
};

function Categories({ settings }: { settings: CategoriesSettings }) {
  const { t } = useTranslation();
  const lang = useLang();
  const { products } = usePublicProducts();
  const { data: cats } = usePublicCategories();
  const s = settings;
  const styleProps = styleToProps(s.style);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      if (!p.category_slug) continue;
      map.set(p.category_slug, (map.get(p.category_slug) ?? 0) + 1);
    }
    return map;
  }, [products]);

  const items = useMemo(() => {
    const list = cats ?? [];
    let ordered = list;
    if (s.categorySlugs && s.categorySlugs.length > 0) {
      const bySlug = new Map(list.map((c) => [c.slug, c]));
      ordered = s.categorySlugs
        .map((slug) => bySlug.get(slug))
        .filter((c): c is PublicCategory => Boolean(c));
    }
    return ordered.map((c) => ({
      slug: c.slug,
      name: localizedField(c, "name", lang).value,
      desc:
        (t(`home.categories.${c.slug}_desc` as never, { defaultValue: "" }) as string) || "",
      img: CATEGORY_IMAGE_MAP[c.slug] ?? catAccessories,
      count: counts.get(c.slug) ?? 0,
    }));
  }, [cats, counts, lang, t, s.categorySlugs]);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [snapCount, setSnapCount] = useState(1);
  const [activeIdx, setActiveIdx] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const recompute = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const pages = Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth));
    setSnapCount(pages);
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    setActiveIdx(Math.min(pages - 1, Math.max(0, idx)));
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    recompute();
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => recompute();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", recompute);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", recompute);
    };
  }, [recompute, items.length]);

  const scrollToPage = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  const nudge = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  };

  return (
    <section
      className={`${styleProps.className}`}
      style={{ backgroundColor: s.style?.bgColor ?? "var(--background)", ...(s.style?.textColor ? { color: s.style.textColor } : {}) }}
    >
      <div className="mx-auto max-w-[1280px] px-4 md:px-8">
        {/* Section heading */}
        <div className="flex items-end justify-between gap-4">
          <div className="text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#c9a84c]">
              {t("home.categories.eyebrow")}
            </p>
            <h2 className="mt-2 font-[Archivo] text-3xl font-black leading-tight tracking-tight text-primary md:text-4xl lg:text-5xl">
              {pickLocalized(s.title, lang, t("home.categories.title"))}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground md:text-base">
              {pickLocalized(s.subtitle, lang, t("home.categories.subtitle"))}
            </p>
          </div>
          <Link
            to="/catalog"
            className="hidden shrink-0 items-center gap-1 text-sm font-semibold uppercase tracking-wider text-primary transition hover:gap-2 md:inline-flex"
          >
            {t("cta.view_all", { defaultValue: "Lihat semua" })}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Carousel */}
        <div className="group relative mt-5 md:mt-6">
          {/* Arrows (desktop) */}
          <button
            type="button"
            aria-label="Previous categories"
            onClick={() => nudge(-1)}
            disabled={!canPrev}
            className="absolute left-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-primary opacity-0 shadow transition group-hover:opacity-100 disabled:opacity-0 lg:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next categories"
            onClick={() => nudge(1)}
            disabled={!canNext}
            className="absolute right-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-primary opacity-0 shadow transition group-hover:opacity-100 disabled:opacity-0 lg:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div
            ref={scrollerRef}
            className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth scroll-pl-4 px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] md:-mx-8 md:px-8 md:scroll-pl-8 md:gap-5 [&::-webkit-scrollbar]:hidden"
          >
            {items.map((cat) => (
              <div
                key={cat.slug}
                className="w-[74%] shrink-0 snap-start sm:w-[44%] md:w-[34%] lg:w-[28%] xl:w-[24%]"
              >
                <CategoryCard cat={cat} />
              </div>
            ))}
          </div>
        </div>

        {/* Dots */}
        {snapCount > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            {Array.from({ length: snapCount }).map((_, i) => {
              const active = i === activeIdx;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => scrollToPage(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={active ? "true" : undefined}
                  className={
                    "rounded-full transition-all " +
                    (active
                      ? "h-2 w-5 bg-primary"
                      : "h-2 w-2 bg-primary/25 hover:bg-primary/50")
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

type CategoryItem = {
  slug: string;
  img: string;
  name: string;
  desc: string;
  count: number;
};

function CategoryCard({ cat }: { cat: CategoryItem }) {
  const { t } = useTranslation();
  return (
    <Link
      to={"/c/$slug" as never}
      params={{ slug: cat.slug } as never}
      className="group/card flex h-full flex-col overflow-hidden rounded-xl border border-[#d4b896] bg-background transition duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={cat.img}
          alt={cat.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <h3 className="font-[Archivo] text-base font-bold tracking-tight text-primary md:text-lg">
            {cat.name}
          </h3>
          {cat.desc && (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {cat.desc}
            </p>
          )}
          {cat.count > 0 && (
            <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
              {cat.count} {t("labels.items", { defaultValue: "produk" })}
            </p>
          )}
        </div>
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[#1a3a2e] transition group-hover/card:gap-2">
          {t("cta.explore")} <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

/* ---------- Featured Products ---------- */
function FeaturedProducts({ settings }: { settings: FeaturedProductsSettings }) {
  const { t } = useTranslation();
  const lang = useLang();
  const { products } = usePublicProducts();
  const s = settings;
  const styleProps = styleToProps(s.style);
  const count = Math.max(1, Math.min(24, s.count ?? 8));
  const featured: PublicProduct[] = useMemo(() => {
    if (s.source === "manual" && s.productIds && s.productIds.length > 0) {
      const byId = new Map(products.map((p) => [p.id, p]));
      const list = s.productIds.map((id) => byId.get(id)).filter((p): p is PublicProduct => Boolean(p));
      return list.slice(0, count);
    }
    const f = products.filter((p) => p.is_featured);
    return (f.length ? f : products).slice(0, count);
  }, [products, s.source, s.productIds, count]);
  const prefix = lang === "id" ? "produk" : "products";

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [snapCount, setSnapCount] = useState(1);
  const [activeIdx, setActiveIdx] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const recompute = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const pages = Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth));
    setSnapCount(pages);
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    setActiveIdx(Math.min(pages - 1, Math.max(0, idx)));
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    recompute();
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => recompute();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", recompute);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", recompute);
    };
  }, [recompute, featured.length]);

  const scrollToPage = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  const nudge = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  };

  return (
    <section
      className={`mx-auto max-w-[1280px] px-4 md:px-8 ${styleProps.className}`}
      style={styleProps.inlineStyle}
    >
      {/* Section heading */}
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#c9a84c]">
          {pickLocalized(s.subtitle, lang, t("home.featured.eyebrow"))}
        </p>
        <h2 className="mt-2 font-[Archivo] text-4xl font-black leading-tight tracking-tight text-primary md:text-5xl">
          {pickLocalized(s.title, lang, t("home.featured.title"))}
        </h2>
      </div>

      {/* Carousel */}
      <div className="group relative mt-8 md:mt-10">
        {/* Arrows (desktop) */}
        <button
          type="button"
          aria-label="Previous products"
          onClick={() => nudge(-1)}
          disabled={!canPrev}
          className="absolute left-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-primary opacity-0 shadow transition group-hover:opacity-100 disabled:opacity-0 lg:flex"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Next products"
          onClick={() => nudge(1)}
          disabled={!canNext}
          className="absolute right-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-primary opacity-0 shadow transition group-hover:opacity-100 disabled:opacity-0 lg:flex"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div
          ref={scrollerRef}
          className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth scroll-pl-4 px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] md:-mx-8 md:px-8 md:scroll-pl-8 md:gap-5 [&::-webkit-scrollbar]:hidden"
        >
          {featured.map((p) => {
            const name = localizedField(p, "name", lang).value;
            const desc = localizedField(p, "short_description", lang).value;
            return (
              <div
                key={p.id}
                className="group w-[74%] shrink-0 snap-start sm:w-[44%] md:w-[34%] lg:w-[28%] xl:w-[24%]"
              >
                <Link
                  to={`/${lang}/${prefix}/${p.slug ?? p.sku}` as never}
                  aria-label={name}
                  className="block relative aspect-square w-full max-w-[1080px] overflow-hidden rounded-xl bg-muted cursor-pointer"
                >
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={name}
                      loading="lazy"
                      className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : null}
                </Link>
                <div className="mt-4">
                  <h3 className="font-[Archivo] text-base font-bold leading-snug text-primary">{name}</h3>
                  {desc ? <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{desc}</p> : null}
                  <PriceDisplay product={p} lang={lang} size="sm" className="mt-2" />
                  <Link
                    to={`/${lang}/${prefix}/${p.slug ?? p.sku}` as never}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[#1a3a2e] transition group-hover:gap-2"
                  >
                    {t("cta.view_details")} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dots */}
      {snapCount > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {Array.from({ length: snapCount }).map((_, i) => {
            const active = i === activeIdx;
            return (
              <button
                key={i}
                type="button"
                onClick={() => scrollToPage(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={active ? "true" : undefined}
                className={
                  "rounded-full transition-all " +
                  (active
                    ? "h-2 w-5 bg-primary"
                    : "h-2 w-2 bg-primary/25 hover:bg-primary/50")
                }
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ---------- Community ---------- */
function Community({ settings }: { settings: CommunitySettings }) {
  const lang = useLang();
  const s = settings;
  const styleProps = styleToProps(s.style);
  const body = (lang === "en" ? s.bodyEn : s.bodyId) || s.bodyEn || s.bodyId || "";
  const paragraphs = body.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const imgRight = (s.imageSide ?? "right") === "right";
  const imgSrc = s.image && s.image.trim() ? s.image : communityCleanup;
  return (
    <section
      className={styleProps.className}
      style={{ backgroundColor: s.style?.bgColor ?? "#1a3a2e", color: s.style?.textColor ?? "#ffffff" }}
    >
      <div className="mx-auto grid max-w-[1280px] items-center gap-10 px-4 md:grid-cols-2 md:px-8">
        {/* Text */}
        <div className={imgRight ? "order-2 md:order-1" : "order-2 md:order-2"}>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#d4b896]">
            {pickLocalized(s.eyebrow, lang)}
          </p>
          <h2 className="mt-4 font-[Archivo] text-4xl font-black leading-tight tracking-tight md:text-5xl">
            {pickLocalized(s.heading, lang)}
          </h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed opacity-90 md:text-lg">
            {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
          </div>
          {s.cta && pickLocalized({ id: s.cta.labelId, en: s.cta.labelEn }, lang) && (
            <a
              href={s.cta.href || "/"}
              className="mt-10 inline-flex items-center gap-2 rounded-full bg-[#d4b896] px-6 py-3 text-sm font-semibold uppercase tracking-wider text-[#1a3a2e] transition hover:bg-[#c9a84c]"
            >
              {pickLocalized({ id: s.cta.labelId, en: s.cta.labelEn }, lang)} <ArrowRight className="h-4 w-4" />
            </a>
          )}
        </div>
        {/* Image */}
        <div className={imgRight ? "order-1 md:order-2" : "order-1 md:order-1"}>
          <div className="overflow-hidden rounded-2xl">
            <img
              src={imgSrc}
              alt="Community"
              width={1024}
              height={1280}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Stats ---------- */
function StatsSection({ settings }: { settings: StatsSettings }) {
  const lang = useLang();
  const s = settings;
  const styleProps = styleToProps(s.style);
  const items = s.items ?? [];
  if (items.length === 0) return <></>;
  return (
    <section className={styleProps.className} style={styleProps.inlineStyle}>
      <div className="mx-auto max-w-[1280px] px-4 md:px-8">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {items.map((st, i) => (
            <div key={i} className="border-t border-border pt-4">
              <div className="font-[Archivo] text-3xl font-black tracking-tight text-primary md:text-4xl">{st.value}</div>
              <div className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                {pickLocalized({ id: st.labelId, en: st.labelEn }, lang)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Store Locator ---------- */
function StoreLocator(_: { settings?: unknown }) {
  const { t } = useTranslation();
  return (
    <section className="mx-auto max-w-[1280px] px-4 py-8 md:px-8 md:py-12 lg:py-20">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">{t("home.store_locator.eyebrow")}</p>
          <h2 className="mt-2 font-[Archivo] text-4xl font-black leading-tight tracking-tight text-primary md:text-5xl">
            {t("home.store_locator.title")}
          </h2>
          <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
            {t("home.store_locator.subtitle")}
          </p>
          <Link
            to="/stores"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground transition hover:bg-secondary"
          >
            <MapPin className="h-4 w-4" /> {t("cta.all_stores")}
          </Link>
        </div>
        <div className="lg:col-span-7">
          <ul className="divide-y divide-border border-y border-border">
            {stores.map((s) => (
              <li key={s.city} className="group grid grid-cols-[auto_1fr_auto] items-center gap-6 py-5">
                <span className="font-[Archivo] text-2xl font-black tracking-tight text-primary md:text-3xl">
                  {s.city}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{s.addr}</p>
                  <p className="text-xs text-muted-foreground">{s.phone}</p>
                </div>
                <ArrowUpRight className="h-5 w-5 text-secondary transition group-hover:translate-x-1 group-hover:-translate-y-1" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ---------- Contact ---------- */
function ContactSection(_: { settings?: unknown }) {
  return <ContactSectionInner />;
}

/* ---------- FAQ ---------- */
function FAQSection(_: { settings?: unknown }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="bg-background py-8 md:py-12 lg:py-20" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-3xl px-4 md:px-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#c9a84c]">{t("home.faq.eyebrow")}</p>
          <h2
            id="faq-heading"
            className="mt-2 font-[Archivo] text-4xl font-black leading-tight tracking-tight text-primary md:text-5xl"
          >
            {t("home.faq.title")}
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            {t("home.faq.subtitle")}
          </p>
        </div>

        <ul className="mt-8 md:mt-10 divide-y divide-border border-y border-border">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <li key={f.q}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left"
                >
                  <h3 className="font-[Archivo] text-base font-bold text-primary md:text-lg">
                    {f.q}
                  </h3>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-primary transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="pb-5 pr-10 text-sm leading-relaxed text-muted-foreground md:text-base">
                    {f.a}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function ContactSectionInner() {
  const { t } = useTranslation();
  const subjects = [
    t("home.contact.subject_product"),
    t("home.contact.subject_wholesale"),
    t("home.contact.subject_press"),
    t("home.contact.subject_career"),
    t("home.contact.subject_other"),
  ];
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState<string>(subjects[0]);
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const resetForm = () => {
    setFullName(""); setEmail(""); setSubject(subjects[0]); setMessage("");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (website.trim() !== "") {
      resetForm();
      setStatus("success");
      return;
    }

    const name = fullName.trim();
    const mail = email.trim();
    const msg = message.trim();
    if (!name || !mail || !msg || !subject) {
      setStatus("error");
      setErrorMsg(t("home.contact.fill_all"));
      return;
    }
    if (!emailRegex.test(mail)) {
      setStatus("error");
      setErrorMsg(t("home.contact.invalid_email"));
      return;
    }

    setStatus("submitting");
    const { error } = await supabase.from("contact_inquiries").insert({
      full_name: name, email: mail, subject, message: msg,
    });
    if (error) {
      setStatus("error");
      setErrorMsg(t("home.contact.submit_error"));
      return;
    }
    resetForm();
    setStatus("success");
  };

  return (
    <section className="bg-muted/60 py-8 md:py-12 lg:py-20">
      <div className="mx-auto grid max-w-[1280px] gap-14 px-4 md:grid-cols-2 md:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">{t("home.contact.eyebrow")}</p>
          <h2 className="mt-2 font-[Archivo] text-4xl font-black leading-tight tracking-tight text-primary md:text-5xl">
            {t("home.contact.title_1")}<br />{t("home.contact.title_2")}
          </h2>
          <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
            {t("home.contact.subtitle")}
          </p>
          <div className="mt-10 space-y-4 text-sm">
            <div className="flex items-center gap-3 text-foreground">
              <Mail className="h-4 w-4 text-secondary" /> hello@consina.com
            </div>
            <div className="flex items-center gap-3 text-foreground">
              <Phone className="h-4 w-4 text-secondary" /> +62 21 345 6789
            </div>
            <div className="flex items-center gap-3 text-foreground">
              <MapPin className="h-4 w-4 text-secondary" /> Jakarta, Indonesia
            </div>
          </div>
        </div>
        <form
          onSubmit={onSubmit}
          className="rounded-sm border border-border bg-background p-6 md:p-8"
        >
          {/* Honeypot — hidden from real users */}
          <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
            <label htmlFor="website">Website</label>
            <input
              id="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("labels.name")} id="name" value={fullName} onChange={setFullName} />
            <Field label={t("labels.email")} id="email" type="email" value={email} onChange={setEmail} />
          </div>
          <div className="mt-4">
            <label htmlFor="subject" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("labels.subject")}
            </label>
            <select
              id="subject"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-2 w-full border-b border-border bg-transparent py-2 text-sm text-foreground outline-none focus:border-primary"
            >
              {subjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="mt-4">
            <label htmlFor="msg" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("labels.message")}
            </label>
            <textarea
              id="msg"
              rows={5}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-2 w-full resize-none border-b border-border bg-transparent py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
          {status === "success" && (
            <p className="mt-6 rounded-sm border border-green-600/30 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
              {t("home.contact.success")}
            </p>
          )}
          {status === "error" && errorMsg && (
            <p className="mt-6 rounded-sm border border-red-600/30 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              {errorMsg}
            </p>
          )}
          <button
            type="submit"
            disabled={status === "submitting"}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground transition hover:bg-secondary disabled:opacity-60"
          >
            {status === "submitting" ? t("cta.sending") : t("cta.send_message")} <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </section>
  );
}

function Field({
  label, id, type = "text", value, onChange,
}: {
  label: string; id: string; type?: string;
  value?: string; onChange?: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        type={type}
        required
        value={value ?? ""}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className="mt-2 w-full border-b border-border bg-transparent py-2 text-sm text-foreground outline-none focus:border-primary"
      />
    </div>
  );
}

/* ---------- FAQ (custom) ---------- */
function FaqCustomSection({ settings }: { settings: FaqCustomSettings }) {
  const lang = useLang();
  const s = settings;
  const styleProps = styleToProps(s.style);
  const items = s.items ?? [];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className={styleProps.className} style={styleProps.inlineStyle}>
      <div className="mx-auto max-w-3xl px-4 md:px-8">
        <div className="text-center">
          {pickLocalized(s.eyebrow, lang) && (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#c9a84c]">{pickLocalized(s.eyebrow, lang)}</p>
          )}
          <h2 className="mt-2 font-[Archivo] text-4xl font-black leading-tight tracking-tight text-primary md:text-5xl">
            {pickLocalized(s.title, lang)}
          </h2>
          {pickLocalized(s.subtitle, lang) && (
            <p className="mt-3 text-base text-muted-foreground">{pickLocalized(s.subtitle, lang)}</p>
          )}
        </div>
        <ul className="mt-8 md:mt-10 divide-y divide-border border-y border-border">
          {items.map((f, i) => {
            const q = pickLocalized({ id: f.questionId, en: f.questionEn }, lang);
            const a = pickLocalized({ id: f.answerId, en: f.answerEn }, lang);
            const isOpen = open === i;
            return (
              <li key={i}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left"
                >
                  <h3 className="font-[Archivo] text-base font-bold text-primary md:text-lg">{q}</h3>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-primary transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && a && (
                  <p className="pb-5 pr-10 text-sm leading-relaxed text-muted-foreground md:text-base">{a}</p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ---------- Newsletter ---------- */
function NewsletterSection({ settings }: { settings: NewsletterSettings }) {
  const lang = useLang();
  const s = settings;
  const styleProps = styleToProps(s.style);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const mail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      setStatus("err");
      setErrMsg("Invalid email");
      return;
    }
    setStatus("loading");
    const { error } = await supabase
      .from("newsletter_subscribers")
      .insert({ email: mail, source: "homepage", locale: lang });
    if (error && !/duplicate/i.test(error.message)) {
      setStatus("err");
      setErrMsg(error.message);
      return;
    }
    setStatus("ok");
    setEmail("");
  };
  return (
    <section
      className={styleProps.className}
      style={{ ...styleProps.inlineStyle, backgroundColor: s.style?.bgColor ?? styleProps.inlineStyle.backgroundColor ?? "#f5efe6" }}
    >
      <div className="mx-auto max-w-2xl px-4 text-center md:px-8">
        {pickLocalized(s.eyebrow, lang) && (
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">{pickLocalized(s.eyebrow, lang)}</p>
        )}
        <h2 className="mt-2 font-[Archivo] text-3xl font-black tracking-tight text-primary md:text-4xl">
          {pickLocalized(s.heading, lang)}
        </h2>
        {pickLocalized(s.body, lang) && (
          <p className="mt-3 text-base text-muted-foreground">{pickLocalized(s.body, lang)}</p>
        )}
        <form onSubmit={onSubmit} className="mx-auto mt-6 flex max-w-md flex-col gap-2 sm:flex-row">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={pickLocalized(s.placeholder, lang, "Email")}
            className="h-11 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="h-11 rounded-full bg-primary px-6 text-sm font-semibold uppercase tracking-wider text-primary-foreground transition hover:bg-secondary disabled:opacity-60"
          >
            {pickLocalized(s.buttonLabel, lang, "Subscribe")}
          </button>
        </form>
        {status === "ok" && (
          <p className="mt-3 text-sm font-medium text-green-700">{pickLocalized(s.successMessage, lang, "Thanks!")}</p>
        )}
        {status === "err" && errMsg && <p className="mt-3 text-sm text-red-700">{errMsg}</p>}
      </div>
    </section>
  );
}

/* ---------- Image Banner ---------- */
function ImageBannerSection({ settings }: { settings: ImageBannerSettings }) {
  const lang = useLang();
  const s = settings;
  const styleProps = styleToProps(s.style);
  const align = s.alignment ?? "center";
  const overlay = Math.max(0, Math.min(100, s.overlay ?? 35));
  const heightClass = s.height === "S" ? "min-h-[260px]" : s.height === "L" ? "min-h-[560px]" : "min-h-[400px]";
  const alignClass =
    align === "left"
      ? "items-start text-left"
      : align === "right"
        ? "items-end text-right"
        : "items-center text-center";
  return (
    <section className={styleProps.className} style={styleProps.inlineStyle}>
      <div className="mx-auto max-w-[1280px] px-4 md:px-8">
        <div className={`relative overflow-hidden rounded-2xl ${heightClass}`}>
          {s.image && (
            <img src={s.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: `rgba(0,0,0,${(overlay / 100).toFixed(2)})` }}
          />
          <div className={`relative flex h-full flex-col justify-center gap-4 p-8 md:p-14 ${alignClass} ${heightClass}`}>
            {pickLocalized(s.eyebrow, lang) && (
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">{pickLocalized(s.eyebrow, lang)}</p>
            )}
            <h2 className="font-[Archivo] text-3xl font-black leading-tight tracking-tight text-white md:text-5xl">
              {pickLocalized(s.heading, lang)}
            </h2>
            {pickLocalized(s.body, lang) && (
              <p className="max-w-xl text-base text-white/90">{pickLocalized(s.body, lang)}</p>
            )}
            <div className={align === "center" ? "mx-auto" : ""}>
              <CTAButton cta={s.cta} lang={lang} defaultStyle="primary" iconRight />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Gallery ---------- */
function GallerySection({ settings }: { settings: GallerySettings }) {
  const lang = useLang();
  const s = settings;
  const styleProps = styleToProps(s.style);
  const images = s.images ?? [];
  const cols = s.columns ?? 3;
  const gridClass =
    cols === 2 ? "sm:grid-cols-2" : cols === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3";
  return (
    <section className={styleProps.className} style={styleProps.inlineStyle}>
      <div className="mx-auto max-w-[1280px] px-4 md:px-8">
        {pickLocalized(s.title, lang) && (
          <h2 className="font-[Archivo] text-3xl font-black tracking-tight text-primary md:text-4xl">
            {pickLocalized(s.title, lang)}
          </h2>
        )}
        {pickLocalized(s.subtitle, lang) && (
          <p className="mt-2 text-base text-muted-foreground">{pickLocalized(s.subtitle, lang)}</p>
        )}
        <div className={`mt-6 grid grid-cols-1 gap-3 md:gap-4 ${gridClass}`}>
          {images.map((img, i) => {
            const tile = (
              <div className="aspect-square overflow-hidden rounded-xl bg-muted">
                <img src={img.src} alt={img.alt ?? ""} loading="lazy" className="h-full w-full object-cover transition hover:scale-[1.03]" />
              </div>
            );
            return img.href ? (
              <a key={i} href={img.href}>{tile}</a>
            ) : (
              <div key={i}>{tile}</div>
            );
          })}
          {images.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
              Add images in the Design editor.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- Testimonials ---------- */
function TestimonialsSection({ settings }: { settings: TestimonialsSettings }) {
  const lang = useLang();
  const s = settings;
  const styleProps = styleToProps(s.style);
  const items = s.items ?? [];
  return (
    <section className={styleProps.className} style={styleProps.inlineStyle}>
      <div className="mx-auto max-w-[1280px] px-4 md:px-8">
        <div className="text-center">
          {pickLocalized(s.eyebrow, lang) && (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">{pickLocalized(s.eyebrow, lang)}</p>
          )}
          {pickLocalized(s.title, lang) && (
            <h2 className="mt-2 font-[Archivo] text-3xl font-black tracking-tight text-primary md:text-4xl">
              {pickLocalized(s.title, lang)}
            </h2>
          )}
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((it, i) => {
            const quote = pickLocalized({ id: it.quoteId, en: it.quoteEn }, lang);
            const rating = Math.max(0, Math.min(5, it.rating ?? 0));
            return (
              <figure key={i} className="rounded-xl border border-border bg-background p-6">
                {rating > 0 && (
                  <div className="mb-3 text-accent">{"★".repeat(rating)}{"☆".repeat(5 - rating)}</div>
                )}
                <blockquote className="text-base leading-relaxed text-foreground">“{quote}”</blockquote>
                <figcaption className="mt-4 flex items-center gap-3">
                  {it.avatar && <img src={it.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />}
                  <div>
                    <div className="text-sm font-semibold text-primary">{it.author}</div>
                    {it.role && <div className="text-xs text-muted-foreground">{it.role}</div>}
                  </div>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- Spacer ---------- */
function SpacerSection({ settings }: { settings: SpacerSettings }) {
  const s = settings;
  const h = Math.max(0, Math.min(400, s.height ?? 48));
  return (
    <div
      style={{ height: h, backgroundColor: s.style?.bgColor }}
      className="w-full"
    >
      {s.showDivider && (
        <div className="mx-auto h-full max-w-[1280px] px-4 md:px-8">
          <div className="h-full border-t border-border" style={{ marginTop: h / 2 }} />
        </div>
      )}
    </div>
  );
}

/* ---------- Announcement Bar ---------- */
function AnnouncementBarSection({ settings }: { settings: AnnouncementBarSettings }) {
  const lang = useLang();
  const s = settings;
  const msg = pickLocalized(s.message, lang);
  if (!msg) return <></>;
  const linkLabel = pickLocalized(s.linkLabel, lang);
  return (
    <div
      className="w-full px-4 py-2 text-center text-xs font-medium md:text-sm"
      style={{
        backgroundColor: s.bgColor ?? s.style?.bgColor ?? "#1a3a2e",
        color: s.textColor ?? s.style?.textColor ?? "#ffffff",
      }}
    >
      <span>{msg}</span>
      {linkLabel && s.href && (
        <a href={s.href} className="ml-2 underline underline-offset-2 hover:opacity-80">
          {linkLabel}
        </a>
      )}
    </div>
  );
}
