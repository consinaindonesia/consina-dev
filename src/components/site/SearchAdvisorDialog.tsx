import { Link } from "@tanstack/react-router";
import { Loader2, MessageCircleMore, Search, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLang } from "@/i18n/LangProvider";
import { localizedCategoryName, localizedProductName } from "@/i18n/format";
import { usePublicProducts, type PublicProduct } from "@/lib/public-products";
import { PriceDisplay } from "@/components/site/PriceDisplay";

type AdvisorTurn = {
  role: "user" | "assistant";
  content: string;
};

type AdvisorProductResult = {
  id: string;
  sku: string;
  slug: string | null;
  name_en: string;
  name_id: string;
  category_slug?: string | null;
  category_name_en: string | null;
  category_name_id: string | null;
  price_idr: number;
  original_price_idr: number | null;
  sale_price_idr: number | null;
  is_on_sale: boolean;
  discount_percent: number | string | null;
  stock: number;
  stock_status: string;
  image_url: string | null;
};

type AdvisorResponse = {
  advice: string;
  products: AdvisorProductResult[];
  searchQuery: string;
  engine: "semantic" | "keyword";
  reranked: boolean;
  vectorReady: boolean;
};

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

function productLabel(product: PublicProduct | AdvisorProductResult, lang: "id" | "en") {
  return localizedProductName(product, lang) || product.name_en || product.name_id;
}

function productCategory(product: PublicProduct | AdvisorProductResult, lang: "id" | "en") {
  return localizedCategoryName(
    {
      slug: "category_slug" in product ? product.category_slug : null,
      name_id: product.category_name_id ?? "",
      name_en: product.category_name_en ?? product.category_name_id ?? "",
    },
    lang,
  );
}

function ProductResultCard({
  product,
  lang,
  onSelect,
}: {
  product: PublicProduct | AdvisorProductResult;
  lang: "id" | "en";
  onSelect: () => void;
}) {
  const imageUrl = "thumbnail_url" in product ? product.thumbnail_url || product.image_url : product.image_url;

  return (
    <Link
      to="/$lang/products/$slug"
      params={{ lang, slug: product.slug || product.sku }}
      onClick={onSelect}
      className="flex items-center gap-3 rounded-2xl border border-border bg-white px-3 py-3 transition hover:border-primary/40 hover:bg-muted/30"
    >
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
        {imageUrl ? (
          <img src={imageUrl} alt={productLabel(product, lang)} className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-sm font-semibold text-primary">{productLabel(product, lang)}</div>
        <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {productCategory(product, lang) || product.sku}
        </div>
        <PriceDisplay product={product as unknown as PublicProduct} lang={lang} size="sm" className="mt-1" />
      </div>
    </Link>
  );
}

export function SearchAdvisorDialog({
  open,
  onOpenChange,
  variant = "dropdown",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: "dropdown" | "chat";
}) {
  const { t } = useTranslation();
  const lang = useLang();
  const isChat = variant === "chat";
  const { products: storefrontProducts, loading } = usePublicProducts();
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<AdvisorTurn[]>([]);
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [advisorError, setAdvisorError] = useState("");
  const [advisorResult, setAdvisorResult] = useState<AdvisorResponse | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setAdvisorError("");
      setAdvisorResult(null);
      setHistory([]);
      return;
    }
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-search-trigger='true']") || target?.closest("[data-chat-trigger='true']")) {
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
    return (featured.length > 0 ? featured : storefrontProducts).slice(0, isChat ? 4 : 8);
  }, [isChat, storefrontProducts]);

  const searchResults = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return [];

    return storefrontProducts
      .map((product) => ({ product, score: scoreProduct(product, trimmed) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, isChat ? 4 : 8)
      .map((entry) => entry.product);
  }, [isChat, query, storefrontProducts]);

  const visibleProducts = query.trim() ? searchResults : featuredProducts;
  const title = query.trim()
    ? lang === "id"
      ? "Hasil Pencarian"
      : "Search Results"
    : lang === "id"
      ? "Best Seller"
      : "Best Sellers";

  const welcomeMessage = isChat
    ? lang === "id"
      ? "Halo, saya AI assistant Consina. Tanyakan kebutuhan Anda seperti carrier untuk hiking 3 hari, sepatu trail, atau order corporate yang butuh stok ready."
      : "Hi, I'm Consina's AI assistant. Ask for needs like a 3-day hiking carrier, trail shoes, or a corporate order with ready stock."
    : "";

  const quickPrompts = lang === "id"
    ? ["carrier untuk hiking 3 hari", "sepatu trail ringan", "corporate order 30 pcs kemeja"]
    : ["3-day hiking carrier", "lightweight trail shoes", "corporate order 30 shirts"];

  async function handleAdvisorSearch(nextQuestion?: string) {
    const question = (nextQuestion ?? query).trim();
    if (!question || advisorLoading) return;

    setAdvisorLoading(true);
    setAdvisorError("");
    setQuery(question);

    try {
      const response = await fetch("/api/public/search/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          history: history.slice(-6),
          lang,
          limit: isChat ? 4 : 5,
        }),
      });

      const json = (await response.json()) as AdvisorResponse & { error?: string };
      if (!response.ok) {
        throw new Error(json.error || (lang === "id" ? "Pencarian AI gagal." : "AI search failed."));
      }

      setAdvisorResult(json);
      setHistory((current) => [
        ...current.slice(-7),
        { role: "user", content: question },
        { role: "assistant", content: json.advice },
      ]);
      setQuery("");
    } catch (error) {
      setAdvisorError(
        error instanceof Error
          ? error.message
          : lang === "id"
            ? "Pencarian AI gagal."
            : "AI search failed.",
      );
    } finally {
      setAdvisorLoading(false);
    }
  }

  const chatShellClass = isChat
    ? "fixed bottom-24 right-5 z-[80] w-[min(420px,calc(100vw-24px))] rounded-[28px] border border-border bg-white shadow-[0_24px_80px_rgba(13,61,41,0.22)]"
    : "rounded-2xl border border-border bg-white shadow-sm";

  const outerClass = isChat
    ? ""
    : "absolute inset-x-0 top-full z-50 border-t border-border/70 bg-white/96 shadow-2xl backdrop-blur-sm";

  const body = (
    <div ref={containerRef} className={isChat ? chatShellClass : "mx-auto w-full max-w-[1280px] px-4 py-4 md:px-8"}>
      <div className={isChat ? "" : chatShellClass}>
        <div className={`flex items-center gap-3 border-b border-border ${isChat ? "px-5 py-4" : "px-4 py-3"}`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            {isChat ? <MessageCircleMore className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground">
              {isChat
                ? lang === "id"
                  ? "Chat dengan Consina Assistant"
                  : "Chat with Consina Assistant"
                : lang === "id"
                  ? "Cari Produk Consina"
                  : "Search Consina Products"}
            </div>
            <div className="text-xs text-muted-foreground">
              {isChat
                ? lang === "id"
                  ? "Tanya seperti ke customer service: kebutuhan produk, stok, atau order corporate."
                  : "Ask like a customer service chat: product needs, stock, or corporate orders."
                : lang === "id"
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

        {isChat ? (
          <>
            <div className="max-h-[60vh] overflow-y-auto px-4 py-4">
              <div className="space-y-4">
                <div className="max-w-[85%] rounded-[22px] rounded-bl-md bg-muted px-4 py-3 text-sm leading-7 text-foreground/90">
                  {welcomeMessage}
                </div>

                {history.map((turn, index) => (
                  <div key={`${turn.role}-${index}`} className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-[22px] px-4 py-3 text-sm leading-7 ${
                        turn.role === "user"
                          ? "rounded-br-md bg-primary text-primary-foreground"
                          : "rounded-bl-md bg-muted text-foreground/90"
                      }`}
                    >
                      <p className="whitespace-pre-line">{turn.content}</p>
                      {turn.role === "assistant" && advisorResult && index === history.length - 1 ? (
                        <div className="mt-3 space-y-3">
                          {advisorResult.products.map((product) => (
                            <ProductResultCard
                              key={product.id}
                              product={product}
                              lang={lang}
                              onSelect={() => onOpenChange(false)}
                            />
                          ))}
                          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                            {advisorResult.searchQuery} · {advisorResult.engine}
                            {advisorResult.reranked ? " · reranked" : ""}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}

                {!history.length ? (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {lang === "id" ? "Contoh pertanyaan" : "Suggested prompts"}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {quickPrompts.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => void handleAdvisorSearch(prompt)}
                          className="rounded-full border border-border bg-background px-3 py-2 text-sm text-foreground/80 transition hover:border-primary/30 hover:text-primary"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {advisorError ? (
                  <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {advisorError}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="border-t border-border px-4 py-4">
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-3 py-3">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleAdvisorSearch();
                    }
                  }}
                  placeholder={lang === "id" ? "Tulis pesan Anda..." : "Write your message..."}
                  className="h-auto border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleAdvisorSearch()}
                  disabled={advisorLoading || !query.trim()}
                  className="rounded-full px-4"
                >
                  {advisorLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : lang === "id" ? "Kirim" : "Send"}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="px-4 py-4">
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-3 py-3">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleAdvisorSearch();
                  }
                }}
                placeholder={t("nav.search_placeholder")}
                className="h-auto border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => void handleAdvisorSearch()}
                disabled={advisorLoading || !query.trim()}
                className="rounded-full px-4"
              >
                {advisorLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : lang === "id" ? "Tanya AI" : "Ask AI"}
              </Button>
            </div>

            {advisorResult ? (
              <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/[0.03] px-4 py-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
                  {lang === "id" ? "Jawaban Advisor" : "Advisor Answer"}
                </div>
                <p className="whitespace-pre-line text-sm leading-7 text-foreground/90">{advisorResult.advice}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  <span>Query: {advisorResult.searchQuery}</span>
                  <span>· {advisorResult.engine}</span>
                  {advisorResult.reranked ? <span>· reranked</span> : null}
                </div>
              </div>
            ) : null}

            {advisorError ? (
              <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {advisorError}
              </div>
            ) : null}

            <div className="mt-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {advisorResult
                  ? lang === "id"
                    ? "Produk Rekomendasi"
                    : "Recommended Products"
                  : title}
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
              ) : visibleProducts.length === 0 && !advisorResult ? (
                <div className="rounded-2xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
                  {lang === "id"
                    ? "Produk tidak ditemukan. Coba kata kunci lain seperti nama model atau SKU."
                    : "No products found. Try another keyword such as the model name or SKU."}
                </div>
              ) : (
                <div className="max-h-[60vh] overflow-y-auto">
                  <div className="space-y-3 pr-1">
                    {(advisorResult ? advisorResult.products : visibleProducts).map((product) => (
                      <ProductResultCard
                        key={product.id}
                        product={product}
                        lang={lang}
                        onSelect={() => onOpenChange(false)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (!open) return null;
  return isChat ? body : <div className={outerClass}>{body}</div>;
}
