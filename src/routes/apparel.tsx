import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import hero from "@/assets/hero-mountain.jpg";
import catCarriers from "@/assets/cat-carriers.jpg";
import catTents from "@/assets/cat-tents.jpg";
import catFootwear from "@/assets/cat-footwear.jpg";
import catAccessories from "@/assets/cat-accessories.jpg";
import prodTrailwind from "@/assets/prod-trailwind.jpg";
import prodRaptor from "@/assets/prod-raptor.jpg";

export const Route = createFileRoute("/apparel")({
  head: () => ({
    meta: [
      { title: "Apparel — Consina | Jackets, Pants & Shirts for the Trail" },
      { name: "description", content: "Shop Consina outdoor apparel — jackets, pants, and shirts engineered for hiking, trekking, and camping across Indonesia." },
      { property: "og:title", content: "Apparel — Consina" },
      { property: "og:description", content: "Jackets, pants, and shirts engineered for the trail." },
    ],
  }),
  component: ApparelPage,
});

const products = [
  { name: "Trailwind Jacket", badge: "Jackets", desc: "Wind-resistant, water-repellent shell", price: "IDR 850,000", img: prodTrailwind },
  { name: "Stormpeak Shell", badge: "Jackets", desc: "3-layer waterproof jacket for alpine conditions", price: "IDR 1,250,000", img: prodTrailwind },
  { name: "Highland Pants", badge: "Pants", desc: "Stretch trekking pants with reinforced knees", price: "IDR 650,000", img: prodRaptor },
  { name: "Summit Shorts", badge: "Pants", desc: "Quick-dry hiking shorts with zip pockets", price: "IDR 380,000", img: prodRaptor },
  { name: "Ridge Base Tee", badge: "Base Layers", desc: "Merino-blend base layer for temperature control", price: "IDR 320,000", img: prodTrailwind },
  { name: "Alpine Shirt", badge: "Shirts", desc: "Breathable long-sleeve for sun protection", price: "IDR 420,000", img: prodTrailwind },
  { name: "Frostline Down", badge: "Jackets", desc: "Lightweight down jacket for cold camps", price: "IDR 1,450,000", img: prodRaptor },
  { name: "Trail Zip-Off", badge: "Pants", desc: "Convertible pants for changing weather", price: "IDR 580,000", img: prodRaptor },
];

const related = [
  { name: "Carriers", slug: "carriers", desc: "Backpacks 40–100L for every adventure", img: catCarriers },
  { name: "Tents & Shelter", slug: "tents", desc: "From solo overnighters to group expeditions", img: catTents },
  { name: "Footwear", slug: "footwear", desc: "Trekking shoes built for Indonesian terrain", img: catFootwear },
  { name: "Accessories", slug: "accessories", desc: "Bottles, headlamps, compasses, and more", img: catAccessories },
];

const typeFilters = ["All", "Jackets", "Pants", "Shirts", "Base Layers"];
const genderFilters = ["All", "Men", "Women", "Unisex"];

function ApparelPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <PageHeader />
      <FilterBar />
      <ProductGrid />
      <RelatedCategories />
      <Footer />
    </div>
  );
}

function PageHeader() {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <img src={hero} alt="Mountain landscape" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d1f17]/85 via-[#1a3a2e]/75 to-[#1a3a2e]/60" />
      </div>
      <div className="mx-auto max-w-[1280px] px-4 pb-20 pt-40 md:px-8 md:pb-28 md:pt-48">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#d4b896]">Category</p>
        <h1 className="mt-4 font-[Archivo] text-5xl font-black leading-[0.95] tracking-tight text-white md:text-7xl">
          Apparel
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/85 md:text-lg">
          Jackets, pants, and shirts engineered for the trail.
        </p>
      </div>
    </section>
  );
}

function FilterPills({ label, options }: { label: string; options: string[] }) {
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
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function FilterBar() {
  return (
    <section className="border-b border-border bg-muted/40">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-5 px-4 py-6 md:flex-row md:items-center md:gap-10 md:px-8">
        <FilterPills label="Type" options={typeFilters} />
        <FilterPills label="Gender" options={genderFilters} />
      </div>
    </section>
  );
}

function ProductGrid() {
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
                View Details <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RelatedCategories() {
  return (
    <section className="border-t border-border bg-background py-20 md:py-24">
      <div className="mx-auto max-w-[1280px] px-4 md:px-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#c9a84c]">Keep Browsing</p>
          <h2 className="mt-3 font-[Archivo] text-3xl font-black leading-tight tracking-tight text-primary md:text-4xl">
            Related Categories
          </h2>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {related.map((cat) => (
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
                  Explore <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
