import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import hero from "@/assets/hero-mountain.jpg";
import catCarriers from "@/assets/cat-carriers.jpg";
import catTents from "@/assets/cat-tents.jpg";
import catApparel from "@/assets/cat-apparel.jpg";
import catAccessories from "@/assets/cat-accessories.jpg";
import prodRaptor from "@/assets/prod-raptor.jpg";
import prodCenturion from "@/assets/prod-centurion.jpg";

const SITE_URL = "https://consina-website.lovable.app";
const PAGE_URL = `${SITE_URL}/footwear`;


const products = [
  { name: "Trailblazer Mid GTX", badge: "Hiking Boots", desc: "Waterproof mid-cut boot for rugged trails", price: "IDR 1,450,000", img: prodRaptor },
  { name: "Summit Low", badge: "Hiking Boots", desc: "Lightweight low-cut for fast hiking", price: "IDR 1,150,000", img: prodCenturion },
  { name: "Ridge Runner", badge: "Trail Runners", desc: "Responsive trail shoe with aggressive grip", price: "IDR 950,000", img: prodRaptor },
  { name: "Rivercross Sandal", badge: "Sandals", desc: "Adjustable trekking sandal for wet terrain", price: "IDR 480,000", img: prodCenturion },
  { name: "Alpine Pro GTX", badge: "Hiking Boots", desc: "Heavy-duty boot for mountaineering", price: "IDR 1,850,000", img: prodRaptor },
  { name: "Forest Glide", badge: "Trail Runners", desc: "Cushioned trail runner for long distances", price: "IDR 1,050,000", img: prodCenturion },
  { name: "Campus Strap", badge: "Sandals", desc: "Comfortable everyday outdoor sandal", price: "IDR 350,000", img: prodRaptor },
  { name: "Rockmaster Approach", badge: "Hiking Boots", desc: "Sticky-rubber approach shoe for scrambling", price: "IDR 1,250,000", img: prodCenturion },
];

const related = [
  { name: "Carriers", slug: "carriers", desc: "Backpacks 40–100L for every adventure", img: catCarriers },
  { name: "Tents & Shelter", slug: "tents", desc: "From solo overnighters to group expeditions", img: catTents },
  { name: "Apparel", slug: "apparel", desc: "Jackets, pants, and shirts for the trail", img: catApparel },
  { name: "Accessories", slug: "accessories", desc: "Bottles, headlamps, compasses, and more", img: catAccessories },
];

const typeFilters = ["All", "Hiking Boots", "Trail Runners", "Sandals"];
const activityFilters = ["All", "Trekking", "Trail Running", "Camping", "Travel"];

export function FootwearPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        <PageHeader />
        <FilterBar />
        <ProductGrid />
        <RelatedCategories />
      </main>
      <Footer />
    </div>
  );
}

function PageHeader() {
  const { t } = useTranslation();
  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <img src={hero} alt="Mountain landscape" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d1f17]/85 via-[#1a3a2e]/75 to-[#1a3a2e]/60" />
      </div>
      <div className="mx-auto max-w-[1280px] px-4 pb-20 pt-40 md:px-8 md:pb-28 md:pt-48">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#d4b896]">{t("cat_page.eyebrow")}</p>
        <h1 className="mt-4 font-[Archivo] text-5xl font-black leading-[0.95] tracking-tight text-white md:text-7xl">
          {t("categories.footwear")}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/85 md:text-lg">
          {t("cat_page.subtitle.footwear")}
        </p>
      </div>
    </section>
  );
}

function FilterPills({ label, options }: { label: string; options: string[] }) {
  const { t } = useTranslation();
  const [active, setActive] = useState(options[0]);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}:</span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => setActive(opt)}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
              active === opt
                ? "border-[#1a3a2e] bg-[#1a3a2e] text-white"
                : "border-[#d4b896] bg-background text-foreground/80 hover:border-[#1a3a2e]"
            }`}
          >
            {t(`filters.values.${opt}`, { defaultValue: opt })}
          </button>
        ))}
      </div>
    </div>
  );
}

function FilterBar() {
  const { t } = useTranslation();
  return (
    <section className="border-b border-border bg-muted/40">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-5 px-4 py-6 md:flex-row md:items-center md:gap-10 md:px-8">
        <FilterPills label={t("filters.type")} options={typeFilters} />
        <FilterPills label={t("filters.activity")} options={activityFilters} />
      </div>
    </section>
  );
}

function ProductGrid() {
  const { t } = useTranslation();
  return (
    <section className="mx-auto max-w-[1280px] px-4 py-16 md:px-8 md:py-24">
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((p) => (
          <div key={p.name} className="group">
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-muted">
              <img
                src={p.img}
                alt={p.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <span className="absolute left-3 top-3 rounded-full bg-[#1a3a2e] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                {p.badge}
              </span>
            </div>
            <div className="mt-4">
              <h3 className="font-[Archivo] text-base font-bold leading-snug text-primary">{p.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
              <p className="mt-2 text-sm font-semibold text-primary">{p.price}</p>
              <Link
                to="/catalog"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[#1a3a2e] transition group-hover:gap-2"
              >
                {t("cta.view_details")} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RelatedCategories() {
  const { t } = useTranslation();
  const localizedRelated = related.map((r) => ({
    ...r,
    name: t(`categories.${r.slug}` as const, { defaultValue: r.name }),
    desc: t(`home.categories.${r.slug}_desc` as const, { defaultValue: r.desc }) }));
  return (
    <section className="border-t border-border bg-background py-20 md:py-24">
      <div className="mx-auto max-w-[1280px] px-4 md:px-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#c9a84c]">{t("cat_page.keep_browsing")}</p>
          <h2 className="mt-3 font-[Archivo] text-3xl font-black leading-tight tracking-tight text-primary md:text-4xl">
            {t("cat_page.related_categories")}
          </h2>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {localizedRelated.map((cat) => (
            <Link
              key={cat.slug}
              to="/c/$slug"
              params={{ slug: cat.slug }}
              className="group flex aspect-square flex-col overflow-hidden rounded-xl border border-[#d4b896] bg-background transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative h-[60%] overflow-hidden">
                <img
                  src={cat.img}
                  alt={cat.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="flex h-[40%] flex-col justify-between p-4">
                <div>
                  <h3 className="font-[Archivo] text-lg font-bold tracking-tight text-primary">{cat.name}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{cat.desc}</p>
                </div>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[#1a3a2e] transition group-hover:gap-2">
                  {t("cta.explore")} <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
