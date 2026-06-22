import { Link } from "@tanstack/react-router";
import { Loader2, Search, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatPrice } from "@/i18n/format";
import { useLang } from "@/i18n/LangProvider";
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

const QUICK_PROMPTS = {
  id: [
    "carrier untuk hiking 3 hari",
    "sepatu trail yang ringan",
    "tenda untuk 2 orang",
  ],
  en: [
    "carrier for a 3-day hike",
    "lightweight trail shoes",
    "tent for 2 people",
  ],
} as const;

export function SearchAdvisorDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const lang = useLang();
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<AdvisorTurn[]>([]);
  const [products, setProducts] = useState<AdvisorProduct[]>([]);
  const [advice, setAdvice] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const prompts = QUICK_PROMPTS[lang];

  const resetConversation = () => {
    setQuestion("");
    setHistory([]);
    setProducts([]);
    setAdvice("");
    setSearchQuery("");
    setError("");
    setLoading(false);
  };

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
          history,
          lang,
          limit: 5,
        }),
      });

      const data = (await res.json()) as AdvisorResponse & { error?: string };
      if (!res.ok || data.error) {
        throw new Error(data.error || "Search request failed");
      }

      setHistory((prev) => [
        ...prev,
        { role: "user", content: trimmed },
        { role: "assistant", content: data.advice },
      ]);
      setProducts(data.products ?? []);
      setAdvice(data.advice ?? "");
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

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) resetConversation();
      }}
    >
      <DialogContent className="max-h-[85vh] max-w-4xl overflow-hidden p-0">
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

        <div className="grid gap-0 md:grid-cols-[1.1fr_0.9fr]">
          <div className="flex min-h-[520px] flex-col border-b border-border md:border-b-0 md:border-r">
            <form onSubmit={onSubmit} className="border-b border-border p-4">
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
              <div className="mt-3 flex flex-wrap gap-2">
                {prompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void ask(prompt)}
                    className="rounded-full border border-primary/20 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </form>

            <div className="flex-1 overflow-y-auto p-4">
              {!advice && !loading && (
                <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-5 text-sm text-muted-foreground">
                  {lang === "id"
                    ? "Mulai dengan pertanyaan seperti: “carrier untuk hiking 3 hari”, “sepatu trail yang ringan”, atau “tenda untuk 2 orang”."
                    : "Start with prompts like: “carrier for a 3-day hike”, “lightweight trail shoes”, or “tent for 2 people”."}
                </div>
              )}

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              {searchQuery && (
                <div className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {lang === "id" ? "Query dipakai" : "Search query"}: {searchQuery}
                </div>
              )}

              {advice && (
                <div className="rounded-3xl bg-[#f6f3ec] p-5 text-sm leading-7 text-foreground">
                  {advice.split("\n").map((line, index) => (
                    <p key={index} className={index === 0 ? "" : "mt-3"}>
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex min-h-[520px] flex-col">
            <div className="border-b border-border px-4 py-3">
              <div className="text-sm font-semibold text-primary">
                {lang === "id" ? "Produk Rekomendasi" : "Recommended Products"}
              </div>
              <div className="text-xs text-muted-foreground">
                {lang === "id"
                  ? "Harga dan detail di bawah diambil langsung dari katalog."
                  : "Prices and details below come directly from the catalog."}
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {products.length === 0 && !loading ? (
                <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                  {lang === "id"
                    ? "Belum ada produk yang ditampilkan."
                    : "No products to show yet."}
                </div>
              ) : null}

              {products.map((product) => {
                const name = lang === "id" ? product.name_id : product.name_en;
                const category =
                  (lang === "id" ? product.category_name_id : product.category_name_en) ||
                  product.category_name_en ||
                  product.category_name_id;
                const description =
                  (lang === "id" ? product.short_description_id : product.short_description_en) ||
                  product.short_description_en ||
                  product.short_description_id;
                const slug = product.slug || product.sku;
                return (
                  <Link
                    key={product.id}
                    to="/$lang/products/$slug"
                    params={{ lang, slug }}
                    className="flex gap-3 rounded-2xl border border-border bg-background p-3 transition hover:border-primary/40 hover:shadow-sm"
                  >
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
                      {product.image_url ? (
                        <img src={product.image_url} alt={name} className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-base font-bold text-primary">{name}</div>
                      {category ? <div className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">{category}</div> : null}
                      {description ? <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{description}</p> : null}
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-primary">
                          {formatPrice(product.sale_price_idr ?? product.price_idr, lang)}
                        </div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          {product.stock_status}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
