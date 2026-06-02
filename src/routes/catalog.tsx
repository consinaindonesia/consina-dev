import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { usePublicProducts, type PublicProduct } from "@/lib/public-products";
import { useLang } from "@/i18n/LangProvider";
import { formatPrice, localizedField } from "@/i18n/format";

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
  const lang = useLang();
  const { products, loading } = usePublicProducts();

  const grouped = useMemo(() => {
    const map = new Map<string, { slug: string; name: string; items: PublicProduct[] }>();
    for (const p of products) {
      const slug = p.category_slug ?? "uncategorized";
      const name = lang === "id"
        ? p.category_name_id ?? p.category_name_en ?? "Uncategorized"
        : p.category_name_en ?? p.category_name_id ?? "Uncategorized";
      const bucket = map.get(slug) ?? { slug, name, items: [] };
      bucket.items.push(p);
      map.set(slug, bucket);
    }
    return Array.from(map.values());
  }, [products, lang]);

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
                key={g.slug}
                href={`#${g.slug}`}
                className="rounded-full border border-border bg-background px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary transition hover:bg-primary hover:text-primary-foreground"
              >
                {g.name} <span className="ml-1 text-[10px] text-muted-foreground">({g.items.length})</span>
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-4 py-16 md:px-8 md:py-24">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("category_detail.loading", { defaultValue: "Loading..." })}
          </div>
        ) : grouped.length === 0 ? (
          <div className="rounded-xl border border-dashed border-input bg-card py-16 text-center text-sm text-muted-foreground">
            No products available yet.
          </div>
        ) : (
        <div className="space-y-24">
          {grouped.map(({ slug, name, items }) => {
            return (
              <section key={slug} id={slug} className="scroll-mt-24">
                <div className="flex flex-col gap-3 border-b-2 border-primary pb-5 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                      {t("catalog.items_count", { count: items.length })}
                    </p>
                    <h2 className="mt-2 font-[Archivo] text-3xl font-black tracking-tight text-primary md:text-5xl">
                      {name}
                    </h2>
                  </div>
                  <Link
                    to="/c/$slug"
                    params={{ slug }}
                    className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-secondary hover:text-primary"
                  >
                    View all <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
                  {items.map((p) => (
                    <ProductCard key={p.id} p={p} lang={lang} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function ProductCard({ p, lang }: { p: PublicProduct; lang: "id" | "en" }) {
  const name = localizedField(p, "name", lang).value;
  const slugPrefix = lang === "id" ? "produk" : "products";
  return (
    <Link
      to={`/${lang}/${slugPrefix}/${encodeURIComponent(p.sku)}` as string}
      className="group block"
    >
      <div className="relative aspect-square overflow-hidden rounded-sm bg-muted">
        {p.image_url ? (
          <img
            src={p.thumbnail_url ?? p.image_url}
            alt={name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-muted" />
        )}
        <ArrowUpRight className="absolute right-3 top-3 h-4 w-4 text-primary-foreground opacity-0 transition group-hover:opacity-100" />
      </div>
      <div className="mt-4">
        <h3 className="line-clamp-2 font-[Archivo] text-sm font-bold leading-snug text-primary">
          {name}
        </h3>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-sm font-semibold text-secondary">{formatPrice(p.price_idr, lang)}</span>
        </div>
      </div>
    </Link>
  );
}
