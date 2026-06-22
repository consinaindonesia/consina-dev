import { Link } from "@tanstack/react-router";
import { Loader2, Search, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatPrice } from "@/i18n/format";
import { useLang } from "@/i18n/LangProvider";
import { usePublicProducts } from "@/lib/public-products";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type AdvisorTurn = {
  role: "user" | "assistant";
  content: string;
};

type AdvisorProduct = {
  id: string;
  sku: string;
  slug: string | null;
  name_en: string;
  name_id: string;
  category_name_en: string | null;
  category_name_id: string | null;
  short_description_en: string | null;
  short_description_id: string | null;
  price_idr: number;
  sale_price_idr: number | null;
  image_url: string | null;
  stock_status: string;
};

type AdvisorResponse = {
  advice: string;
  products: AdvisorProduct[];
  searchQuery: string;
};

const MAX_HISTORY_TURNS = 10;

export function SearchAdvisorDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const lang = useLang();
  const { products: storefrontProducts } = usePublicProducts();
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<AdvisorTurn[]>([]);
  const [products, setProducts] = useState<AdvisorProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const resetConversation = () => {
    setQuestion("");
    setHistory([]);
    setProducts([]);
    setSearchQuery("");
    setError("");
    setLoading(false);
  };

  const featuredProducts = storefrontProducts.filter((product) => product.is_featured).slice(0, 6);

  const ask = async (nextQuestion: string) => {
    const trimmed = nextQuestion.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/public/search/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: trimmed,
          history: history.slice(-MAX_HISTORY_TURNS),
          lang,
          limit: 5,
        }),
      });

      const data = (await res.json()) as AdvisorResponse & { error?: string };
      if (!res.ok || data.error) {
        throw new Error(data.error || "Search request failed");
      }

      setHistory((prev) =>
        [
          ...prev,
          { role: "user", content: trimmed },
          { role: "assistant", content: data.advice },
        ].slice(-MAX_HISTORY_TURNS),
      );
      setProducts(data.products ?? []);
      setSearchQuery(data.searchQuery ?? "");
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void ask(question);
  };

  const renderProductRow = ({
    id,
    slug,
    sku,
    name,
    category,
    price,
    imageUrl,
  }: {
    id: string;
    slug: string | null;
    sku: string;
    name: string;
    category: string | null;
    price: number | null;
    imageUrl?: string | null;
  }) => {
    const targetSlug = slug || sku;
    return (
      <Link
        key={id}
        to="/$lang/products/$slug"
        params={{ lang, slug: targetSlug }}
        className="flex items-center gap-4 rounded-2xl border border-border bg-background px-3 py-3 transition hover:border-primary/40"
      >
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
          {imageUrl ? <img src={imageUrl} alt={name} className="h-full w-full object-cover" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-sm font-semibold text-primary">{name}</div>
          {category ? <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{category}</div> : null}
          {price !== null ? <div className="mt-2 text-sm font-semibold text-foreground">{formatPrice(price, lang)}</div> : null}
        </div>
      </Link>
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) resetConversation();
      }}
    >
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border bg-[linear-gradient(135deg,#173a2d_0%,#254f3f_100%)] px-6 py-5 text-white">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5" />
            {lang === "id" ? "Cari dengan AI Advisor" : "Search with AI Advisor"}
          </DialogTitle>
          <DialogDescription className="text-sm text-white/80">
            {lang === "id"
              ? "Tanyakan kebutuhan Anda, lalu advisor akan merekomendasikan produk Consina yang paling relevan."
              : "Describe what you need and the advisor will recommend the most relevant Consina products."}
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 md:p-5">
          <form onSubmit={onSubmit} className="rounded-3xl border border-border bg-[#faf8f2] p-4">
            <div className="flex gap-2">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={t("nav.search_placeholder", { defaultValue: "Cari produk..." })}
                className="h-11 bg-background"
              />
              <Button type="submit" disabled={loading || !question.trim()} className="h-11 rounded-full px-5">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </form>

          <div className="mt-4">
            {error && (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {searchQuery && (
              <div className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {lang === "id" ? "Query dipakai" : "Search query"}: {searchQuery}
              </div>
            )}

            <div className="grid gap-5 rounded-3xl border border-border bg-background p-4 md:grid-cols-[1.4fr_0.8fr]">
              <section>
                <div className="mb-3 text-2xl font-semibold text-primary">
                  {lang === "id" ? "Rekomendasi" : "Featured Results"}
                </div>
                <div className="space-y-3">
                  {products.length === 0 && !loading ? (
                    <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                      {lang === "id"
                        ? "Ketik nama atau kategori produk untuk melihat hasil pencarian."
                        : "Type a product name or category to see search results."}
                    </div>
                  ) : null}

                  {products.map((product) =>
                    renderProductRow({
                      id: product.id,
                      slug: product.slug,
                      sku: product.sku,
                      name: lang === "id" ? product.name_id : product.name_en,
                      category:
                        (lang === "id" ? product.category_name_id : product.category_name_en) ||
                        product.category_name_en ||
                        product.category_name_id,
                      price: product.sale_price_idr ?? product.price_idr,
                      imageUrl: product.image_url,
                    }),
                  )}
                </div>
              </section>

              <section>
                <div className="mb-3 text-2xl font-semibold text-primary">
                  {lang === "id" ? "Best Seller" : "Best Sellers"}
                </div>
                <div className="space-y-3">
                  {featuredProducts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                      {lang === "id"
                        ? "Belum ada best seller yang tersedia."
                        : "No best sellers are available yet."}
                    </div>
                  ) : null}

                  {featuredProducts.map((product) =>
                    renderProductRow({
                      id: product.id,
                      slug: product.slug,
                      sku: product.sku,
                      name: lang === "id" ? product.name_id : product.name_en,
                      category:
                        (lang === "id" ? product.category_name_id : product.category_name_en) ||
                        product.category_name_en ||
                        product.category_name_id,
                      price: product.sale_price_idr ?? product.price_idr,
                      imageUrl: product.image_url,
                    }),
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
