import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, MapPin, Mountain, Leaf, Users, Mail, Phone } from "lucide-react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { products, categoryOrder } from "@/data/products";
import hero from "@/assets/hero-mountain.jpg";
import catCarriers from "@/assets/cat-carriers.jpg";
import catTents from "@/assets/cat-tents.jpg";
import catApparel from "@/assets/cat-apparel.jpg";
import catFootwear from "@/assets/cat-footwear.jpg";
import catAccessories from "@/assets/cat-accessories.jpg";
import community from "@/assets/community.jpg";
import story from "@/assets/story.jpg";
import communityCleanup from "@/assets/community-cleanup.jpg";
import storyHiker from "@/assets/story-hiker.jpg";
import prodCenturion from "@/assets/prod-centurion.jpg";
import prodRaptor from "@/assets/prod-raptor.jpg";
import prodStratus from "@/assets/prod-stratus.jpg";
import prodTrailwind from "@/assets/prod-trailwind.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Consina — The Outdoor Lifestyle | Inspired by Experience" },
      {
        name: "description",
        content: "Indonesian outdoor gear since 1999 — backpack carriers, tents, apparel, footwear and accessories built for the archipelago's adventurers.",
      },
      { property: "og:title", content: "Consina — The Outdoor Lifestyle" },
      { property: "og:description", content: "Indonesian outdoor gear since 1999. Inspired by experience." },
      { property: "og:image", content: hero },
    ],
  }),
  component: HomePage,
});

function catStats(filter: string) {
  const items = products.filter((p) => p.category === filter);
  const max = items.length ? Math.max(...items.map((i) => i.discount)) : 0;
  return { count: items.length, max };
}
const categories = [
  { name: "Carriers", slug: "carriers", filter: "Bags & Carriers", desc: "Backpacks 40–100L for every adventure", img: catCarriers },
  { name: "Tents & Shelter", slug: "tents", filter: "Tents & Shelter", desc: "From solo overnighters to group expeditions", img: catTents },
  { name: "Apparel", slug: "apparel", filter: "Apparel", desc: "Jackets, pants, and shirts for the trail", img: catApparel },
  { name: "Footwear", slug: "footwear", filter: "Footwear", desc: "Trekking shoes built for Indonesian terrain", img: catFootwear },
  { name: "Accessories", slug: "accessories", filter: "Camping & Cookware", desc: "Bottles, headlamps, compasses, and more", img: catAccessories },
] as const;

const bestsellers = [
  { name: "Centurion 60L Carrier", desc: "Less-contact back system for long expeditions", price: "IDR 1,850,000", img: prodCenturion },
  { name: "Raptor 45L Carrier", desc: "Day-to-weekend hiking companion", price: "IDR 1,250,000", img: prodRaptor },
  { name: "Stratus 2P Tent", desc: "Lightweight 2-person shelter, 4-season rated", price: "IDR 2,100,000", img: prodStratus },
  { name: "Trailwind Jacket", desc: "Wind-resistant, water-repellent shell", price: "IDR 850,000", img: prodTrailwind },
] as const;

const stores = [
  { city: "Jakarta", addr: "Pasar Baru Flagship", phone: "+62 21 345 6789" },
  { city: "Bandung", addr: "Jl. Sumatera No. 17", phone: "+62 22 723 1144" },
  { city: "Yogyakarta", addr: "Jl. Mangkubumi 22", phone: "+62 274 555 020" },
  { city: "Bali", addr: "Denpasar — Jl. Teuku Umar", phone: "+62 361 224 998" },
];

function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <Hero />
      <BrandStory />
      <Categories />
      <FeaturedProducts />
      <Community />
      <StoreLocator />
      <ContactSection />
      <Footer />
    </div>
  );
}

/* ---------- Hero ---------- */
function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <img
          src={hero}
          alt="Indonesian volcanic mountain at dawn"
          width={1920}
          height={1080}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/40 via-primary/30 to-background" />
      </div>
      <div className="mx-auto flex min-h-[88vh] max-w-[1280px] flex-col justify-end px-4 pb-16 pt-32 md:px-8 md:pb-24">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
          The Outdoor Lifestyle — Est. 1999
        </p>
        <h1 className="mt-5 max-w-4xl font-[Archivo] text-5xl font-black leading-[0.95] tracking-tight text-primary-foreground md:text-7xl lg:text-[88px]">
          Inspired By <em className="not-italic text-accent">Experience</em>
          <br />
          Built for the archipelago.
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-primary-foreground/85 md:text-lg">
          Gear for hikers, campers, climbers and runners who call Indonesia
          their playground — designed in Jakarta, tested on every island.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            to="/catalog"
            className="group inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold uppercase tracking-wider text-accent-foreground transition hover:bg-accent/90"
          >
            Explore the collection
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/30 px-6 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground transition hover:bg-primary-foreground/10"
          >
            Our story
          </Link>
        </div>
        <div className="mt-16 grid max-w-2xl grid-cols-3 gap-6 border-t border-primary-foreground/20 pt-6 text-[#1a3a2e]">
          {[
            ["25+", "Years on the trail"],
            ["150+", "Stores across Indonesia"],
            ["100%", "Locally crafted"],
          ].map(([n, l]) => (
            <div key={l}>
              <div className="font-[Archivo] text-2xl font-bold text-[#1a3a2e] md:text-3xl">{n}</div>
              <div className="mt-1 text-[11px] uppercase tracking-widest text-[#1a3a2e]">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Brand Story ---------- */
function BrandStory() {
  return (
    <section className="mx-auto max-w-[1280px] px-4 py-24 md:px-8 md:py-32">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        {/* LEFT COLUMN — Image */}
        <div className="order-1">
          <div className="overflow-hidden rounded-2xl">
            <img
              src={storyHiker}
              alt="Hiker on an Indonesian mountain trail"
              width={1024}
              height={1280}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        {/* RIGHT COLUMN — Text */}
        <div className="order-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Our Story
          </p>
          <h2 className="mt-4 font-[Archivo] text-4xl font-black leading-[1.05] tracking-tight text-primary md:text-5xl">
            Inspired by Experience
          </h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-foreground/80 md:text-lg">
            <p>
              Since 1999, Consina has been Indonesia's outdoor lifestyle brand — born in Jakarta, built for adventurers.
            </p>
            <p>
              Every product we make is shaped by feedback from our community of hikers, campers, and climbers. We don't just design gear — we design from lived experience.
            </p>
            <p>
              Today, our 'Responsible Trekker' community spans the entire archipelago, sharing one belief: leave the trail better than you found it.
            </p>
          </div>
          <Link
            to="/"
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground transition hover:bg-secondary"
          >
            Learn more about us <span className="text-base">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- Categories ---------- */
function Categories() {
  return (
    <section className="bg-background py-24 md:py-32">
      <div className="mx-auto max-w-[1280px] px-4 md:px-8">
        {/* Section heading */}
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#c9a84c]">
            Explore
          </p>
          <h2 className="mt-3 font-[Archivo] text-4xl font-black leading-tight tracking-tight text-primary md:text-5xl">
            Shop by Category
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            Built for every adventure, made in Indonesia
          </p>
        </div>

        {/* Cards grid */}
        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {categories.map((cat) => (
            <CategoryCard key={cat.slug} cat={cat} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryCard({ cat }: { cat: typeof categories[number] }) {
  const stats = catStats(cat.filter);
  return (
    <Link
      to="/c/$slug"
      params={{ slug: cat.slug }}
      className="group flex aspect-square flex-col overflow-hidden rounded-xl border border-[#d4b896] bg-background transition duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      {/* Image area — top 60% */}
      <div className="relative h-[60%] overflow-hidden">
        <img
          src={cat.img}
          alt={cat.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {stats.max > 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-[#1a3a2e] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
            Up to {stats.max}% off
          </span>
        )}
      </div>

      {/* Text area — bottom 40% */}
      <div className="flex h-[40%] flex-col justify-between p-4">
        <div>
          <h3 className="font-[Archivo] text-lg font-bold tracking-tight text-primary">
            {cat.name}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {cat.desc}{stats.count ? ` · ${stats.count} items` : ""}
          </p>
        </div>
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[#1a3a2e] transition group-hover:gap-2">
          Explore <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

/* ---------- Featured Products ---------- */
function FeaturedProducts() {
  return (
    <section className="mx-auto max-w-[1280px] px-4 py-24 md:px-8 md:py-32">
      {/* Section heading */}
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#c9a84c]">
          Bestsellers
        </p>
        <h2 className="mt-3 font-[Archivo] text-4xl font-black leading-tight tracking-tight text-primary md:text-5xl">
          Trail-Tested Favorites
        </h2>
      </div>

      {/* Product grid */}
      <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {bestsellers.map((p) => (
          <div key={p.name} className="group">
            {/* Image — 4:5 aspect ratio */}
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-muted">
              <img
                src={p.img}
                alt={p.name}
                width={800}
                height={1000}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            {/* Text */}
            <div className="mt-4">
              <h3 className="font-[Archivo] text-base font-bold leading-snug text-primary">
                {p.name}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {p.desc}
              </p>
              <p className="mt-2 text-sm font-semibold text-primary">
                {p.price}
              </p>
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

/* ---------- Community ---------- */
function Community() {
  return (
    <section className="bg-[#1a3a2e]">
      <div className="mx-auto grid max-w-[1280px] items-center gap-10 px-4 py-24 md:grid-cols-2 md:px-8 md:py-32">
        {/* LEFT COLUMN — Text */}
        <div className="order-2 md:order-1">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#d4b896]">
            Our Community
          </p>
          <h2 className="mt-4 font-[Archivo] text-4xl font-black leading-tight tracking-tight text-white md:text-5xl">
            The Responsible Trekker
          </h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-white/85 md:text-lg">
            <p>
              We believe outdoor adventure and environmental care are inseparable. That's why our community of hikers, climbers, and campers carry one promise: leave the trail better than you found it.
            </p>
            <p>
              Join thousands of Indonesian adventurers who choose gear that respects the mountains they love.
            </p>
          </div>
          <Link
            to="/"
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-[#d4b896] px-6 py-3 text-sm font-semibold uppercase tracking-wider text-[#1a3a2e] transition hover:bg-[#c9a84c]"
          >
            Join the Community <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* RIGHT COLUMN — Image (desktop only) */}
        <div className="order-1 md:order-2">
          <div className="overflow-hidden rounded-2xl">
            <img
              src={communityCleanup}
              alt="Group of hikers cleaning up a trail"
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

/* ---------- Store Locator ---------- */
function StoreLocator() {
  return (
    <section className="mx-auto max-w-[1280px] px-4 py-24 md:px-8 md:py-32">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">Stores</p>
          <h2 className="mt-3 font-[Archivo] text-4xl font-black leading-tight tracking-tight text-primary md:text-5xl">
            Find us across the archipelago.
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
            With more than 150 stores from Aceh to Jayapura, there's a Consina
            counter near every trailhead. Swing by — our staff are hikers too.
          </p>
          <Link
            to="/"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground transition hover:bg-secondary"
          >
            <MapPin className="h-4 w-4" /> All stores
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
function ContactSection() {
  const [sent, setSent] = useState(false);
  return (
    <section className="bg-muted/60 py-24 md:py-32">
      <div className="mx-auto grid max-w-[1280px] gap-14 px-4 md:grid-cols-2 md:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">Contact</p>
          <h2 className="mt-3 font-[Archivo] text-4xl font-black leading-tight tracking-tight text-primary md:text-5xl">
            Got a question?<br />Drop us a line.
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
            Whether it's product care, dealer enquiries, or a trail story you
            want to share — our team in Jakarta reads every message.
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
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
          className="rounded-sm border border-border bg-background p-6 md:p-8"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Name" id="name" />
            <Field label="Email" id="email" type="email" />
          </div>
          <div className="mt-4">
            <Field label="Subject" id="subject" />
          </div>
          <div className="mt-4">
            <label htmlFor="msg" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Message
            </label>
            <textarea
              id="msg"
              rows={5}
              required
              className="mt-2 w-full resize-none border-b border-border bg-transparent py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground transition hover:bg-secondary"
          >
            {sent ? "Thanks — we'll be in touch" : "Send message"} <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </section>
  );
}

function Field({ label, id, type = "text" }: { label: string; id: string; type?: string }) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        type={type}
        required
        className="mt-2 w-full border-b border-border bg-transparent py-2 text-sm text-foreground outline-none focus:border-primary"
      />
    </div>
  );
}
