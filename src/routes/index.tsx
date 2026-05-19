import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, MapPin, Mountain, Leaf, Users, Mail, Phone } from "lucide-react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import hero from "@/assets/hero-mountain.jpg";
import catCarriers from "@/assets/cat-carriers.jpg";
import catTents from "@/assets/cat-tents.jpg";
import catApparel from "@/assets/cat-apparel.jpg";
import catFootwear from "@/assets/cat-footwear.jpg";
import catAccessories from "@/assets/cat-accessories.jpg";
import community from "@/assets/community.jpg";
import story from "@/assets/story.jpg";
import prod1 from "@/assets/prod-1.jpg";
import prod2 from "@/assets/prod-2.jpg";
import prod3 from "@/assets/prod-3.jpg";
import prod4 from "@/assets/prod-4.jpg";

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

const categories = [
  { name: "Carriers", desc: "40L – 100L expedition packs", img: catCarriers, size: "tall" },
  { name: "Tents", desc: "Shelter for every altitude", img: catTents, size: "tall" },
  { name: "Apparel", desc: "Layers built for the trail", img: catApparel, size: "wide" },
  { name: "Footwear", desc: "Trekking & approach", img: catFootwear, size: "wide" },
  { name: "Accessories", desc: "The essentials, refined", img: catAccessories, size: "wide" },
] as const;

const products = [
  { name: "Tarebbi 65L Carrier", price: "Rp 1.450.000", tag: "New", img: prod1 },
  { name: "Magnum Dome Tent 3P", price: "Rp 2.890.000", tag: "Bestseller", img: prod2 },
  { name: "Ridgewalker GTX Boot", price: "Rp 1.795.000", tag: "Trail Tested", img: prod3 },
  { name: "Cascade Softshell Jacket", price: "Rp 990.000", tag: "New", img: prod4 },
];

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
          Inspired by <em className="not-italic text-accent">experience.</em>
          <br />
          Built for the archipelago.
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-primary-foreground/85 md:text-lg">
          Gear for hikers, campers, climbers and runners who call Indonesia
          their playground — designed in Jakarta, tested on every island.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            to="/"
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
        <div className="mt-16 grid max-w-2xl grid-cols-3 gap-6 border-t border-primary-foreground/20 pt-6 text-primary-foreground/90">
          {[
            ["25+", "Years on the trail"],
            ["150+", "Stores across Indonesia"],
            ["100%", "Locally crafted"],
          ].map(([n, l]) => (
            <div key={l}>
              <div className="font-[Archivo] text-2xl font-bold text-accent md:text-3xl">{n}</div>
              <div className="mt-1 text-[11px] uppercase tracking-widest text-primary-foreground/70">{l}</div>
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
      <div className="grid items-center gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="overflow-hidden rounded-sm border border-border">
            <img
              src={story}
              alt="Vintage map of the Indonesian archipelago"
              width={1400}
              height={1000}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
        <div className="lg:col-span-7 lg:pl-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
            Our Story
          </p>
          <h2 className="mt-4 font-[Archivo] text-4xl font-black leading-[1.05] tracking-tight text-primary md:text-5xl">
            A quarter century of Indonesian adventure.
          </h2>
          <p className="mt-6 text-base leading-relaxed text-foreground/80 md:text-lg">
            Founded in Jakarta in 1999, Consina has spent twenty-five years
            outfitting Indonesia's adventurers. We design from where we live —
            for monsoons, volcanic ascents, equatorial heat, and the long ferry
            rides in between. Every seam, strap, and stitch carries the
            knowledge of the people who use them.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              { icon: Mountain, title: "Local pride", body: "Designed and built in Indonesia." },
              { icon: Leaf, title: "Responsible", body: "Trekker code: leave no trace." },
              { icon: Users, title: "Community", body: "Built with — and for — adventurers." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="border-t-2 border-accent pt-4">
                <Icon className="h-5 w-5 text-secondary" />
                <h3 className="mt-3 font-[Archivo] text-base font-bold text-primary">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Categories ---------- */
function Categories() {
  return (
    <section className="bg-primary py-24 text-primary-foreground md:py-32">
      <div className="mx-auto max-w-[1280px] px-4 md:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
              Collections
            </p>
            <h2 className="mt-3 max-w-2xl font-[Archivo] text-4xl font-black leading-tight tracking-tight md:text-5xl">
              Five categories.<br />One promise: gear you can trust.
            </h2>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-accent hover:text-accent/80"
          >
            Shop all <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-14 grid gap-4 md:grid-cols-6 md:grid-rows-2">
          {/* Tall: Carriers */}
          <CategoryCard className="md:col-span-2 md:row-span-2 md:h-[640px]" cat={categories[0]} />
          {/* Tall: Tents */}
          <CategoryCard className="md:col-span-2 md:row-span-2 md:h-[640px]" cat={categories[1]} />
          {/* Wide row */}
          <CategoryCard className="md:col-span-2 md:h-[312px]" cat={categories[2]} />
          <CategoryCard className="md:col-span-1 md:h-[312px]" cat={categories[3]} />
          <CategoryCard className="md:col-span-1 md:h-[312px]" cat={categories[4]} />
        </div>
      </div>
    </section>
  );
}

function CategoryCard({ cat, className = "" }: { cat: typeof categories[number]; className?: string }) {
  return (
    <Link
      to="/"
      className={`group relative block h-72 overflow-hidden rounded-sm bg-secondary ${className}`}
    >
      <img
        src={cat.img}
        alt={cat.name}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-primary/85 via-primary/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 md:p-7">
        <div>
          <h3 className="font-[Archivo] text-2xl font-black tracking-tight text-primary-foreground md:text-3xl">
            {cat.name}
          </h3>
          <p className="mt-1 text-xs uppercase tracking-widest text-accent">{cat.desc}</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition group-hover:rotate-45">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}

/* ---------- Featured Products ---------- */
function FeaturedProducts() {
  return (
    <section className="mx-auto max-w-[1280px] px-4 py-24 md:px-8 md:py-32">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">Featured</p>
          <h2 className="mt-3 max-w-2xl font-[Archivo] text-4xl font-black leading-tight tracking-tight text-primary md:text-5xl">
            Trail-tested. Crew-approved.
          </h2>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          A short list from this season's drop. Each piece is field-tested by
          our crew across Indonesia before it earns the Consina label.
        </p>
      </div>
      <div className="mt-14 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((p) => (
          <Link to="/" key={p.name} className="group block">
            <div className="relative aspect-square overflow-hidden rounded-sm bg-muted">
              <img
                src={p.img}
                alt={p.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <span className="absolute left-3 top-3 rounded-full bg-background/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
                {p.tag}
              </span>
            </div>
            <div className="mt-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-[Archivo] text-base font-bold text-primary">{p.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.price}</p>
              </div>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-secondary opacity-0 transition group-hover:opacity-100" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ---------- Community ---------- */
function Community() {
  return (
    <section className="relative overflow-hidden">
      <img
        src={community}
        alt="Misty Indonesian rainforest trail"
        width={1600}
        height={1000}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/80 to-primary/40" />
      <div className="relative mx-auto grid max-w-[1280px] gap-10 px-4 py-24 text-primary-foreground md:grid-cols-2 md:px-8 md:py-32">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            #ResponsibleTrekker
          </p>
          <h2 className="mt-4 font-[Archivo] text-4xl font-black leading-tight tracking-tight md:text-5xl">
            A community that leaves the trail better than they found it.
          </h2>
        </div>
        <div className="flex flex-col justify-end gap-6">
          <p className="text-base leading-relaxed text-primary-foreground/85 md:text-lg">
            Consina exists because of the people who carry it. We host clean-up
            climbs, sponsor local guides, and back conservation projects from
            Sumatra to Papua. Join the movement — share your route, your
            lessons, your impact.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold uppercase tracking-wider text-accent-foreground transition hover:bg-accent/90"
            >
              Join the community <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/30 px-6 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground transition hover:bg-primary-foreground/10"
            >
              Read the trekker code
            </Link>
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
