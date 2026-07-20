import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Loader2, Filter, X, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useLang } from "@/i18n/LangProvider";
import { PriceDisplay } from "@/components/site/PriceDisplay";
import { addToCart } from "@/lib/cart-store";
import { WishlistButton } from "@/components/site/WishlistButton";
import { StarRating } from "@/components/site/StarRating";
import { localizedCategoryName, localizedProductName } from "@/i18n/format";

export const Route = createFileRoute("/c/$slug")({
  component: CategoryPage,
});

const CATEGORY_SLUG_ALIASES: Record<string, string> = {
  tents: "activities-camping-tenda",
};

type Category = {
  id: string;
  slug: string;
  name_id: string;
  name_en: string;
  description_id: string | null;
  description_en: string | null;
  image_url: string | null;
};

type CategoryNode = {
  id: string;
  parent_category_id: string | null;
};

type AttributeDef = {
  id: string;
  slug: string;
  name_id: string;
  name_en: string;
  type: "text" | "number" | "select";
  unit: string | null;
  options: string[];
};

type ProductRow = {
  id: string;
  slug: string | null;
  sku: string;
  name_en: string;
  name_id: string;
  capacity: string | null;
  price_idr: number;
  weight_grams: number | null;
  original_price_idr: number | null;
  sale_price_idr: number | null;
  is_on_sale: boolean;
  discount_percent: number | null;
  rating_average: number;
  rating_count: number;
  attributes: Record<string, string> | null;
  product_images: Array<{ thumbnail_url: string | null; image_url: string }>;
  images: string[] | null;
  variants: Array<{
    color_hex: string;
    color_name: string;
    price_idr: number | null;
    original_price_idr: number | null;
    sale_price_idr: number | null;
  }>;
  size_variants: Array<{
    price_idr: number | null;
    original_price_idr: number | null;
    stock: number | null;
  }>;
  has_size_variants: boolean;
};

const FILTER_FALLBACK_LABELS: Record<string, { name_en: string; name_id: string; unit?: string | null }> = {
  capacity: { name_en: "Capacity", name_id: "Kapasitas", unit: "L" },
  color: { name_en: "Color", name_id: "Warna" },
  warna: { name_en: "Color", name_id: "Warna" },
};
const FILTER_PREVIEW_COUNT = 6;
const PRIVATE_FILTER_SLUGS = new Set(["source", "import_source", "data_source"]);

function humanizeFilterLabel(slug: string) {
  return slug
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getFilterLabel(def: AttributeDef, lang: "id" | "en") {
  if (lang === "id") return def.name_id || def.name_en;
  return FILTER_FALLBACK_LABELS[def.slug]?.name_en || def.name_en || def.name_id;
}

function normalizeFilterValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    const parts = value
      .map((entry) => normalizeFilterValue(entry))
      .filter((entry): entry is string => !!entry);
    return parts.length > 0 ? parts.join(", ") : null;
  }
  return null;
}

function getProductFilterValues(product: ProductRow, slug: string) {
  const values = new Set<string>();
  const addValue = (value: unknown) => {
    const normalized = normalizeFilterValue(value);
    if (normalized) values.add(normalized);
  };

  if (slug === "capacity") {
    addValue(product.capacity);
    addValue(product.attributes?.capacity);
  } else if (slug === "color") {
    addValue(product.attributes?.color);
    addValue(product.attributes?.warna);
    product.variants.forEach((variant) => addValue(variant.color_name));
  } else {
    addValue(product.attributes?.[slug]);
  }

  return Array.from(values);
}


function CategoryPage() {
  const { slug } = Route.useParams();
  const lang = useLang();
  const [category, setCategory] = useState<Category | null>(null);
  const [attrDefs, setAttrDefs] = useState<AttributeDef[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [filters, setFilters] = useState<Record<string, Set<string>>>({});
  const [expandedFilterGroups, setExpandedFilterGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const requestedSlug = CATEGORY_SLUG_ALIASES[slug] ?? slug;

      // 1. Resolve slug → category, following redirects if needed.
      let { data: cat } = await supabase
        .from("categories")
        .select("id,slug,name_id,name_en,description_id,description_en,image_url")
        .eq("slug", requestedSlug)
        .eq("is_active", true)
        .maybeSingle();

      if (requestedSlug !== slug && !cancelled) {
        window.history.replaceState({}, "", `/c/${requestedSlug}`);
      }

      if (!cat) {
        const { data: redirect } = await supabase
          .from("category_slug_redirects")
          .select("new_slug")
          .eq("old_slug", requestedSlug)
          .maybeSingle();
        if (redirect?.new_slug) {
          // Client-side redirect to the canonical slug
          window.history.replaceState({}, "", `/c/${redirect.new_slug}`);
          const again = await supabase
            .from("categories")
            .select("id,slug,name_id,name_en,description_id,description_en,image_url")
            .eq("slug", redirect.new_slug)
            .eq("is_active", true)
            .maybeSingle();
          cat = again.data ?? null;
        }
      }

      if (cancelled) return;
      if (!cat) {
        setMissing(true);
        setLoading(false);
        return;
      }
      setCategory(cat as Category);

      // 2. Resolve descendant category ids so parent categories show products from subcategories too.
      const { data: allCategories } = await supabase
        .from("categories")
        .select("id,parent_category_id")
        .eq("is_active", true);
      const childMap = new Map<string, string[]>();
      for (const row of ((allCategories ?? []) as CategoryNode[])) {
        if (!row.parent_category_id) continue;
        const siblings = childMap.get(row.parent_category_id) ?? [];
        siblings.push(row.id);
        childMap.set(row.parent_category_id, siblings);
      }
      const categoryIds = new Set<string>([cat.id]);
      const queue = [cat.id];
      while (queue.length > 0) {
        const current = queue.shift()!;
        for (const childId of childMap.get(current) ?? []) {
          if (categoryIds.has(childId)) continue;
          categoryIds.add(childId);
          queue.push(childId);
        }
      }
      const scopedCategoryIds = Array.from(categoryIds);

      // 3. Load attribute schema for this category scope.
      const { data: catAttrs } = await supabase
        .from("category_attributes")
        .select("sort_order, attribute:attributes(id, slug, name_id, name_en, type, unit, options)")
        .in("category_id", scopedCategoryIds)
        .order("sort_order");
      const defsMap = new Map<string, AttributeDef>();
      const catAttrRows = (catAttrs ?? []) as unknown as Array<{
        attribute: AttributeDef | null;
      }>;
      catAttrRows
        .map((r) => r.attribute)
        .filter((a): a is AttributeDef => !!a)
        .forEach((a) => {
          defsMap.set(a.id, { ...a, options: Array.isArray(a.options) ? a.options : [] });
        });
      const defs: AttributeDef[] = Array.from(defsMap.values());
      if (cancelled) return;
      setAttrDefs(defs);

      // 4. Load products with primary image across the full category scope.
      const { data: prods } = await supabase
        .from("products")
        .select(
          "id,sku,slug,name_en,name_id,capacity,price_idr,weight_grams,original_price_idr,sale_price_idr,is_on_sale,discount_percent,rating_average,rating_count,attributes,images,product_images(thumbnail_url,image_url,is_primary,sort_order),product_variants(color_hex,color_name,price_idr,original_price_idr,sale_price_idr,sort_order),product_size_variants(id,price_idr,original_price_idr,stock)",
        )
        .in("category_id", scopedCategoryIds)
        .eq("is_active", true)
        .order("name_en");
      if (cancelled) return;
      const normalized: ProductRow[] = (prods ?? []).map((p) => {
        const imgs = (p.product_images ?? []) as Array<{
          thumbnail_url: string | null;
          image_url: string;
          is_primary: boolean;
          sort_order: number;
        }>;
        imgs.sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.sort_order - b.sort_order);
        const flat = Array.isArray((p as { images?: string[] }).images) ? (p as { images: string[] }).images : [];
        const merged = imgs.length > 0
          ? imgs.slice(0, 1)
          : flat.length > 0
            ? [{ thumbnail_url: flat[0], image_url: flat[0] }]
            : [];
        const variantsRaw = ((p as { product_variants?: Array<{ color_hex: string; color_name: string; price_idr: number | null; original_price_idr: number | null; sale_price_idr: number | null; sort_order: number }> }).product_variants ?? [])
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((v) => ({
            color_hex: v.color_hex,
            color_name: v.color_name,
            price_idr: v.price_idr ?? null,
            original_price_idr: v.original_price_idr ?? null,
            sale_price_idr: v.sale_price_idr ?? null,
          }));
        return {
          id: p.id,
          slug: (p as { slug?: string | null }).slug ?? null,
          sku: p.sku,
          name_en: p.name_en,
          name_id: p.name_id,
          capacity: (p as { capacity?: string | null }).capacity ?? null,
          price_idr: p.price_idr,
          weight_grams: (p as { weight_grams?: number | null }).weight_grams ?? null,
          original_price_idr: (p as { original_price_idr?: number | null }).original_price_idr ?? null,
          sale_price_idr: (p as { sale_price_idr?: number | null }).sale_price_idr ?? null,
          is_on_sale: !!(p as { is_on_sale?: boolean }).is_on_sale,
          discount_percent:
            (p as { discount_percent?: number | string | null }).discount_percent === null ||
            (p as { discount_percent?: number | string | null }).discount_percent === undefined
              ? null
              : Number((p as { discount_percent?: number | string | null }).discount_percent),
          rating_average: Number((p as { rating_average?: number | null }).rating_average ?? 0),
          rating_count: Number((p as { rating_count?: number | null }).rating_count ?? 0),
          attributes: (p.attributes as Record<string, string> | null) ?? null,
          product_images: merged,
          images: flat,
          variants: variantsRaw,
          size_variants: Array.isArray(
            (
              p as {
                product_size_variants?: Array<{
                  price_idr: number | null;
                  original_price_idr: number | null;
                  stock: number | null;
                }>;
              }
            ).product_size_variants,
          )
            ? (
                p as {
                  product_size_variants: Array<{
                    price_idr: number | null;
                    original_price_idr: number | null;
                    stock: number | null;
                  }>;
                }
              ).product_size_variants.map((v) => ({
                price_idr: v.price_idr ?? null,
                original_price_idr: v.original_price_idr ?? null,
                stock: v.stock ?? null,
              }))
            : [],
          has_size_variants:
            Array.isArray((p as { product_size_variants?: unknown[] }).product_size_variants) &&
            ((p as { product_size_variants?: unknown[] }).product_size_variants?.length ?? 0) > 0,
        };
      });
      setProducts(normalized);
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const filterDefs = useMemo(() => {
    const defsBySlug = new Map<string, AttributeDef>();

    attrDefs.forEach((def) => {
      if (PRIVATE_FILTER_SLUGS.has(def.slug)) return;
      defsBySlug.set(def.slug, def);
    });

    const ensureFallbackDef = (slug: string) => {
      if (PRIVATE_FILTER_SLUGS.has(slug)) return;
      if (defsBySlug.has(slug)) return;
      const fallback = FILTER_FALLBACK_LABELS[slug];
      defsBySlug.set(slug, {
        id: `fallback:${slug}`,
        slug,
        name_en: fallback?.name_en ?? humanizeFilterLabel(slug),
        name_id: fallback?.name_id ?? humanizeFilterLabel(slug),
        type: "select",
        unit: fallback?.unit ?? null,
        options: [],
      });
    };

    for (const product of products) {
      if (normalizeFilterValue(product.capacity) || normalizeFilterValue(product.attributes?.capacity)) {
        ensureFallbackDef("capacity");
      }
      if (
        normalizeFilterValue(product.attributes?.color) ||
        normalizeFilterValue(product.attributes?.warna) ||
        product.variants.some((variant) => normalizeFilterValue(variant.color_name))
      ) {
        ensureFallbackDef("color");
      }
      for (const [slug, value] of Object.entries(product.attributes ?? {})) {
        if (PRIVATE_FILTER_SLUGS.has(slug)) continue;
        if (normalizeFilterValue(value)) ensureFallbackDef(slug);
      }
    }

    return Array.from(defsBySlug.values());
  }, [attrDefs, products]);

  // Build filters from the actual product values present inside this category.
  const dynamicFilters = useMemo(() => {
    const out: Array<{ def: AttributeDef; values: string[] }> = [];
    for (const def of filterDefs) {
      const seen = new Set<string>();
      for (const p of products) {
        for (const value of getProductFilterValues(p, def.slug)) {
          seen.add(value);
        }
      }
      if (seen.size > 0) {
        out.push({
          def,
          values: Array.from(seen).sort((a, b) => {
            const an = parseFloat(a);
            const bn = parseFloat(b);
            if (!isNaN(an) && !isNaN(bn)) return an - bn;
            return a.localeCompare(b);
          }),
        });
      }
    }
    return out;
  }, [filterDefs, products]);

  const filtered = useMemo(() => {
    const active = Object.entries(filters).filter(([, set]) => set.size > 0);
    if (active.length === 0) return products;
    return products.filter((p) =>
      active.every(([slug, set]) => {
        const values = getProductFilterValues(p, slug);
        return values.some((value) => set.has(value));
      }),
    );
  }, [products, filters]);

  function toggleFilter(attrSlug: string, value: string) {
    setFilters((prev) => {
      const next = { ...prev };
      const set = new Set(next[attrSlug] ?? []);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      next[attrSlug] = set;
      return next;
    });
  }

  function clearFilters() {
    setFilters({});
  }

  function toggleFilterGroup(slug: string) {
    setExpandedFilterGroups((prev) => ({ ...prev, [slug]: !prev[slug] }));
  }

  const activeFilterCount = Object.values(filters).reduce((sum, s) => sum + s.size, 0);

  if (missing) {
    throw notFound();
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <header className="border-b border-border bg-muted/40">
        <div className="mx-auto max-w-[1440px] px-4 py-10 md:px-6 md:py-14 lg:px-8">
          {category ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">Category</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-primary md:text-5xl">
                {localizedCategoryName(category, lang)}
              </h1>
              {category.description_en && (
                <p className="mt-3 max-w-2xl text-base text-muted-foreground">{category.description_en}</p>
              )}
            </>
          ) : (
            <div className="h-20 animate-pulse rounded bg-muted" />
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-8 md:px-6 md:py-10 lg:px-8">
        <div className="grid grid-cols-1 gap-7 lg:grid-cols-[260px_1fr]">
          {/* Filters */}
          <aside>
            <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-hidden rounded-xl border border-border bg-card">
              <div className="max-h-[calc(100vh-6rem)] overflow-y-auto p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-foreground">
                  <Filter className="h-4 w-4" /> Filters
                </h2>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground">
                    Clear ({activeFilterCount})
                  </button>
                )}
              </div>

              {dynamicFilters.length === 0 ? (
                <p className="text-sm text-muted-foreground">No filters available yet.</p>
              ) : (
                <div className="space-y-5">
                  {dynamicFilters.map(({ def, values }) => (
                    <div key={def.id}>
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                          {getFilterLabel(def, lang)}
                          {def.unit ? ` (${def.unit})` : ""}
                        </h3>
                        {values.length > FILTER_PREVIEW_COUNT && (
                          <button
                            type="button"
                            onClick={() => toggleFilterGroup(def.slug)}
                            className="shrink-0 text-[11px] font-medium text-muted-foreground transition hover:text-primary"
                          >
                            {expandedFilterGroups[def.slug]
                              ? lang === "id"
                                ? "Lebih sedikit"
                                : "Show less"
                              : lang === "id"
                                ? "Lebih banyak"
                                : "Show more"}
                          </button>
                        )}
                      </div>
                      <ul className="space-y-1.5">
                        {(expandedFilterGroups[def.slug] ? values : values.slice(0, FILTER_PREVIEW_COUNT)).map((v) => {
                          const active = filters[def.slug]?.has(v) ?? false;
                          return (
                            <li key={v}>
                              <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground hover:text-primary">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-input"
                                  checked={active}
                                  onChange={() => toggleFilter(def.slug, v)}
                                />
                                <span>{v}</span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </div>
          </aside>

          {/* Product grid */}
          <section>
            {loading ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading products…
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-input bg-card py-16 text-center">
                <p className="text-sm text-muted-foreground">
                  {products.length === 0
                    ? "No products in this category yet."
                    : "No products match the selected filters."}
                </p>
                {activeFilterCount > 0 && (
                  <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                    <X className="mr-1 h-4 w-4" /> Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                <p className="mb-4 text-sm text-muted-foreground">
                  {filtered.length} product{filtered.length === 1 ? "" : "s"}
                </p>
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3">
                  {filtered.map((p) => {
                    const img = p.product_images[0];
                    const prefix = lang === "id" ? "produk" : "products";
                    const detailHref = `/${lang}/${prefix}/${p.slug ?? p.sku}`;
                    const name = localizedProductName(p, lang);
                    const requiresChoice = p.variants.length > 0 || p.has_size_variants;
                    const handleAdd = (e: React.MouseEvent) => {
                      e.preventDefault();
                      e.stopPropagation();
                      addToCart({
                        productId: p.id,
                        slug: p.slug ?? p.sku,
                        sku: p.sku,
                        name_id: p.name_id,
                        name_en: p.name_en,
                        price_idr: p.price_idr,
                        weight_grams: p.weight_grams,
                        thumbnail: img ? (img.thumbnail_url ?? img.image_url) : null,
                        attributes: {},
                        quantity: 1,
                      });
                      toast.success(lang === "id" ? "Ditambahkan ke keranjang" : "Added to cart");
                    };
                    return (
                      <li key={p.id} className="storefront-card-hover group overflow-hidden rounded-xl border border-border bg-card transition hover:shadow-md">
                        <Link to={detailHref as never} className="block cursor-pointer">
                        <div className="relative aspect-square overflow-hidden bg-muted">
                          {img ? (
                            <img
                              src={img.thumbnail_url ?? img.image_url}
                              alt={name}
                              loading="lazy"
                              className="storefront-card-media h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full bg-muted" />
                          )}
                          <WishlistButton productId={p.id} size="xs" className="absolute left-2 bottom-2 md:left-3 md:bottom-3" />
                          {!requiresChoice && (
                            <button
                              type="button"
                              onClick={handleAdd}
                              aria-label={lang === "id" ? "Tambah ke Keranjang" : "Add to cart"}
                              className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground opacity-0 shadow transition group-hover:opacity-100 hover:bg-primary/90"
                            >
                              <ShoppingBag className="h-3.5 w-3.5" />
                              {lang === "id" ? "Tambah" : "Add"}
                            </button>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-medium text-foreground">{name}</h3>
                          {p.rating_count > 0 && (
                            <StarRating rating={p.rating_average} count={p.rating_count} className="mt-1" />
                          )}
                          {p.variants.length > 0 && (
                            <div className="mt-2 flex items-center gap-1">
                              {p.variants.slice(0, 5).map((v, i) => (
                                <span
                                  key={i}
                                  title={v.color_name}
                                  className="h-3 w-3 rounded-full border border-border"
                                  style={{ backgroundColor: v.color_hex }}
                                />
                              ))}
                              {p.variants.length > 5 && (
                                <span className="ml-1 text-[10px] font-medium text-muted-foreground">
                                  +{p.variants.length - 5}
                                </span>
                              )}
                            </div>
                          )}
                          <PriceDisplay product={p} lang={lang} size="sm" className="mt-2" />
                          <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-primary transition group-hover:gap-2">
                            {lang === "id" ? "Lihat detail" : "View details"} <ArrowRight className="h-3.5 w-3.5" />
                          </span>
                        </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
