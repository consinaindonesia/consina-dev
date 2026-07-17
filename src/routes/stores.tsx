import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Clock, MapPin, Navigation, Phone, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { officialStores, type Store } from "@/data/officialStores";

const SITE_URL = "https://www.consinaglobal.com";
const PAGE_URL = `${SITE_URL}/stores`;

export const Route = createFileRoute("/stores")({
  head: () => ({
    meta: [
      { title: "Find a Consina Store - Official Store Locations" },
      {
        name: "description",
        content:
          "Find official Consina store locations across Indonesia, sourced from the latest Consina store locator.",
      },
      { property: "og:title", content: "Find a Consina Store" },
      {
        property: "og:description",
        content: "Official Consina store locations across Indonesia.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: PAGE_URL },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": officialStores.map((s) => ({
            "@type": "LocalBusiness",
            name: s.name,
            ...(s.phone ? { telephone: s.phone } : {}),
            openingHours: s.hours,
            address: {
              "@type": "PostalAddress",
              streetAddress: s.street,
              addressLocality: s.city,
              addressRegion: s.province,
              postalCode: s.postal,
              addressCountry: "ID",
            },
            areaServed: s.region,
            parentOrganization: { "@type": "Organization", name: "Consina" },
          })),
        }),
      },
    ],
  }),
  component: StoresPage,
});

const regions = [
  "All",
  "Jakarta & Greater Jakarta",
  "West Java",
  "Central Java",
  "East Java",
  "Bali & Nusa Tenggara",
  "Sumatra",
  "Kalimantan",
  "Sulawesi",
] as const;

function StoresPage() {
  const [search, setSearch] = useState("");
  const [activeRegion, setActiveRegion] = useState<string>("All");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return officialStores.filter((s) => {
      const matchesRegion = activeRegion === "All" || s.region === activeRegion;
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.street.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.province.toLowerCase().includes(q);
      return matchesRegion && matchesSearch;
    });
  }, [search, activeRegion]);

  const regionCounts = useMemo(() => {
    const counts: Record<string, number> = { All: officialStores.length };
    for (const s of officialStores) {
      counts[s.region] = (counts[s.region] || 0) + 1;
    }
    return counts;
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        <PageHeader search={search} onSearch={setSearch} />
        <RegionTabs active={activeRegion} onChange={setActiveRegion} counts={regionCounts} />
        <StoreList stores={filtered} />
      </main>
      <Footer />
    </div>
  );
}

function PageHeader({ search, onSearch }: { search: string; onSearch: (v: string) => void }) {
  const { t } = useTranslation();
  return (
    <section className="border-b border-border bg-[#f5f0e8]">
      <div className="mx-auto max-w-[1280px] px-4 py-16 md:px-8 md:py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8b7355]">
          {t("stores_page.eyebrow")}
        </p>
        <h1 className="mt-4 text-4xl font-black leading-[0.95] tracking-tight text-primary md:text-6xl">
          {t("stores_page.title")}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
          {t("stores_page.subtitle")}
        </p>

        <div className="mt-8 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={t("stores_page.search_placeholder")}
              className="w-full rounded-lg border border-border bg-card py-3 pl-10 pr-4 text-sm text-foreground shadow-sm outline-none ring-offset-2 transition focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function RegionTabs({
  active,
  onChange,
  counts,
}: {
  active: string;
  onChange: (r: string) => void;
  counts: Record<string, number>;
}) {
  const { t } = useTranslation();
  return (
    <section className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto max-w-[1280px] px-4 md:px-8">
        <div className="flex gap-2 overflow-x-auto py-4 scrollbar-hide">
          {regions.map((r) => {
            const count = counts[r] ?? 0;
            const isActive = active === r;
            return (
              <button
                key={r}
                onClick={() => onChange(r)}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wider transition whitespace-nowrap ${
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground/70 hover:border-primary hover:text-primary"
                }`}
              >
                {t(`stores_page.regions.${r}`, { defaultValue: r })}
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StoreList({ stores }: { stores: Store[] }) {
  const { t } = useTranslation();
  if (stores.length === 0) {
    return (
      <section className="mx-auto max-w-[1280px] px-4 py-20 md:px-8">
        <div className="text-center">
          <MapPin className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-semibold text-foreground">
            {t("stores_page.no_results_title")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("stores_page.no_results_subtitle")}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[1280px] px-4 py-12 md:px-8 md:py-16">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {stores.map((s) => (
          <StoreCard key={s.name} store={s} />
        ))}
      </div>
    </section>
  );
}

function StoreCard({ store }: { store: Store }) {
  const { t } = useTranslation();
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    store.mapsQuery,
  )}`;

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-bold leading-snug text-primary">{store.name}</h3>
        <span className="shrink-0 rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#8b7355]">
          {t(`stores_page.regions.${store.region}`, { defaultValue: store.region })}
        </span>
      </div>

      <div className="mt-4 space-y-2.5 text-sm text-muted-foreground">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/70" />
          <span className="leading-relaxed">
            {store.street}
            <br />
            {store.city}, {store.province}
          </span>
        </div>
        {store.phone ? (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 shrink-0 text-muted-foreground/70" />
            <span>{store.phone}</span>
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0 text-muted-foreground/70" />
          <span>{store.hours}</span>
        </div>
      </div>

      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90"
      >
        <Navigation className="h-3.5 w-3.5" />
        {t("stores_page.get_directions")}
      </a>
    </div>
  );
}
