import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { products, categoryOrder, type Product } from "@/data/products";

export const Route = createFileRoute("/catalog")({
  head: () => ({
    meta: [
      { title: "Catalog — Consina Outdoor Gear with Promo Prices" },
      { name: "description", content: "Browse the full Consina catalog — carriers, tents, apparel, footwear, camping cookware and accessories with discounted rupiah prices." },
    ],
  }),
  component: CatalogPage,
});

function CatalogPage() {
  const { t } = useTranslation();
  const grouped = categoryOrder
    .map((cat) => ({ cat, items: products.filter((p) => p.category === cat) }))
    .filter((g) => g.items.length);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <header className="border-b border-border bg-muted/40">
        <div className="mx-auto max-w-[1280px] px-4 py-16 md:px-8 md:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">{t("catalog.eyebrow")}</p>
          <h1 className="mt-3 font-[Archivo] text-4xl font-black tracking-tight text-primary md:text-6xl">
            {t("catalog.title")}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            {t("catalog.subtitle_prefix", { count: products.length, groups: grouped.length })}{" "}
            <span className="font-semibold text-primary">{t("catalog.subtitle_currency")}</span>
            {t("catalog.subtitle_suffix")}
          </p>
          <nav className="mt-8 flex flex-wrap gap-2">
            {grouped.map((g) => (
              <a
                key={g.cat}
                href={`#${slug(g.cat)}`}
                className="rounded-full border border-border bg-background px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary transition hover:bg-primary hover:text-primary-foreground"
              >
                {g.cat} <span className="ml-1 text-[10px] text-muted-foreground">({g.items.length})</span>
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-4 py-16 md:px-8 md:py-24">
        <div className="space-y-24">
          {grouped.map(({ cat, items }) => {
            const maxDisc = Math.max(...items.map((i) => i.discount));
            return (
              <section key={cat} id={slug(cat)} className="scroll-mt-24">
                <div className="flex flex-col gap-3 border-b-2 border-primary pb-5 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                      {t("catalog.items_count", { count: items.length })}
                    </p>
                    <h2 className="mt-2 font-[Archivo] text-3xl font-black tracking-tight text-primary md:text-5xl">
                      {cat}
                      <span className="ml-3 inline-flex items-center rounded-full bg-accent px-3 py-1 align-middle text-xs font-bold uppercase tracking-wider text-accent-foreground md:text-sm">
                        {t("labels.up_to_off", { percent: maxDisc })}
                      </span>
                    </h2>
                  </div>
                </div>
                <div className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
                  {items.map((p) => (
                    <ProductCard key={p.url} p={p} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function ProductCard({ p }: { p: Product }) {
  return (
    <a
      href={p.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
    >
      <div className="relative aspect-square overflow-hidden rounded-sm bg-muted">
        <img
          src={p.image}
          alt={p.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {p.discount > 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
            -{p.discount}%
          </span>
        )}
        <ArrowUpRight className="absolute right-3 top-3 h-4 w-4 text-primary-foreground opacity-0 transition group-hover:opacity-100" />
      </div>
      <div className="mt-4">
        <h3 className="line-clamp-2 font-[Archivo] text-sm font-bold leading-snug text-primary">
          {p.name}
        </h3>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-sm font-semibold text-secondary">{p.price}</span>
          {p.oldPrice && (
            <span className="text-xs text-muted-foreground line-through">{p.oldPrice}</span>
          )}
        </div>
      </div>
    </a>
  );
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
