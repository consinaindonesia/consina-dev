import { Link } from "@tanstack/react-router";
import { Search, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLang } from "@/i18n/LangProvider";
import { usePublicProducts, type PublicProduct } from "@/lib/public-products";
import { Input } from "@/components/ui/input";
import { PriceDisplay } from "@/components/site/PriceDisplay";

function normalizeSearchText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function scoreProduct(product: PublicProduct, query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return 0;

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 0;

  const nameId = normalizeSearchText(product.name_id);
  const nameEn = normalizeSearchText(product.name_en);
  const sku = normalizeSearchText(product.sku);
  const slug = normalizeSearchText(product.slug);
  const categoryId = normalizeSearchText(product.category_name_id);
  const categoryEn = normalizeSearchText(product.category_name_en);
  const descriptionId = normalizeSearchText(product.short_description_id);
  const descriptionEn = normalizeSearchText(product.short_description_en);
  const haystack = [nameId, nameEn, sku, slug, categoryId, categoryEn, descriptionId, descriptionEn]
    .filter(Boolean)
    .join(" ");

  let score = 0;

  if (nameId === normalizedQuery || nameEn === normalizedQuery) score += 400;
  if (sku === normalizedQuery) score += 380;
  if (slug === normalizedQuery) score += 360;
  if (nameId.startsWith(normalizedQuery) || nameEn.startsWith(normalizedQuery)) score += 220;
  if (sku.startsWith(normalizedQuery) || slug.startsWith(normalizedQuery)) score += 200;
  if (nameId.includes(normalizedQuery) || nameEn.includes(normalizedQuery)) score += 140;
  if (sku.includes(normalizedQuery) || slug.includes(normalizedQuery)) score += 120;
  if (categoryId.includes(normalizedQuery) || categoryEn.includes(normalizedQuery)) score += 80;
  if (haystack.includes(normalizedQuery)) score += 50;

  for (const token of tokens) {
    if (nameId.includes(token) || nameEn.includes(token)) score += 45;
    else if (sku.includes(token) || slug.includes(token)) score += 35;
    else if (categoryId.includes(token) || categoryEn.includes(token)) score += 20;
    else if (haystack.includes(token)) score += 8;
  }

  if (product.is_featured) score += 4;
  return score;
}

function productLabel(product: PublicProduct, lang: "id" | "en") {
  return (lang === "id" ? product.name_id : product.name_en) || product.name_en || product.name_id;
}

function productCategory(product: PublicProduct, lang: "id" | "en") {
  return (
    (lang === "id" ? product.category_name_id : product.category_name_en) ||
    product.category_name_en ||
    product.category_name_id ||
    ""
  );
}

export function SearchAdvisorDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const lang = useLang();
  const { products: storefrontProducts, loading } = usePublicProducts();
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-search-trigger='true']")) {
        return;
      }
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  const featuredProducts = useMemo(() => {
    const featured = storefrontProducts.filter((product) => product.is_featured);
    return (featured.length > 0 ? featured : storefrontProducts).slice(0, 8);
  }, [storefrontProducts]);

  const searchResults = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return [];

    return storefrontProducts
      .map((product) => ({ product, score: scoreProduct(product, trimmed) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((entry) => entry.product);
  }, [query, storefrontProducts]);

  const visibleProducts = query.trim() ? searchResults : featuredProducts;
  const title = query.trim()
    ? lang === "id"
      ? "Hasil Pencarian"
      : "Search Results"
    : lang === "id"
      ? "Best Seller"
      : "Best Sellers";

  if (!open) return null;

  return (
    <div className="absolute inset-x-0 top-full z-50 border-t border-border/70 bg-white/96 shadow-2xl backdrop-blur-sm">
      <div ref={containerRef} className="mx-auto w-full max-w-[1280px] px-4 py-4 md:px-8">
        <div className="rounded-2xl border border-border bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-foreground">
                {lang === "id" ? "Cari Produk Consina" : "Search Consina Products"}
              </div>
              <div className="text-xs text-muted-foreground">
                {lang === "id"
                  ? "Ketik nama produk, SKU, atau kategori untuk hasil yang lebih akurat."
                  : "Type a product name, SKU, or category for more accurate results."}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full p-2 text-foreground/60 transition hover:bg-muted hover:text-foreground"
              aria-label={lang === "id" ? "Tutup pencarian" : "Close search"}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-4 py-4">
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-3 py-3">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("nav.search_placeholder", { defaultValue: "Cari produk..." })}
                className="h-auto border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0"
              />
            </div>

            <div className="mt-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {title}
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[0, 1, 2, 3].map((index) => (
                    <div key={index} className="flex items-center gap-3 rounded-2xl border border-border px-3 py-3">
                      <div className="h-14 w-14 animate-pulse rounded-xl bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : visibleProducts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
                  {lang === "id"
                    ? "Produk tidak ditemukan. Coba kata kunci lain seperti nama model atau SKU."
                    : "No products found. Try another keyword such as the model name or SKU."}
                </div>
              ) : (
                <div className="max-h-[60vh] overflow-y-auto">
                  <div className="space-y-3 pr-1">
                    {visibleProducts.map((product) => {
                      const imageUrl = product.thumbnail_url || product.image_url;
                      return (
                        <Link
                          key={product.id}
                          to="/$lang/products/$slug"
                          params={{ lang, slug: product.slug || product.sku }}
                          onClick={() => onOpenChange(false)}
                          className="flex items-center gap-3 rounded-2xl border border-border bg-white px-3 py-3 transition hover:border-primary/40 hover:bg-muted/30"
                        >
                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                            {imageUrl ? (
                              <img src={imageUrl} alt={productLabel(product, lang)} className="h-full w-full object-cover" />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="line-clamp-2 text-sm font-semibold text-primary">
                              {productLabel(product, lang)}
                            </div>
                            <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                              {productCategory(product, lang) || product.sku}
                            </div>
                            <PriceDisplay product={product} lang={lang} size="sm" className="mt-1" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
