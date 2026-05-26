import { useEffect, useMemo, useState } from "react";
import { Link, notFound, useNavigate } from "@tanstack/react-router";
import { Loader2, MapPin, Check, Minus, Plus, BellRing } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LangProvider";
import { formatPrice, localizedField, hasTranslation } from "@/i18n/format";
import { MissingTranslationNotice } from "@/components/site/MissingTranslationNotice";
import { addToInquiry } from "@/lib/inquiry-store";

type Product = {
  id: string;
  sku: string;
  category_id: string | null;
  name_id: string;
  name_en: string;
  short_description_id: string | null;
  short_description_en: string | null;
  description_id: string | null;
  description_en: string | null;
  price_idr: number;
  capacity: string | null;
  weight_grams: number | null;
  attributes: Record<string, string> | null;
  stock_status: "in_stock" | "low_stock" | "out_of_stock";
};

type ProductImage = {
  image_url: string;
  large_url: string | null;
  thumbnail_url: string | null;
  alt_text_id: string | null;
  alt_text_en: string | null;
  is_primary: boolean;
  sort_order: number;
};

type Category = {
  id: string;
  slug: string;
  name_id: string;
  name_en: string;
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

export function ProductDetailPage({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const lang = useLang();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [attrDefs, setAttrDefs] = useState<AttributeDef[]>([]);
  const [related, setRelated] = useState<Array<{ id: string; sku: string; name_id: string; name_en: string; price_idr: number; thumb: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string>>({});
  const [added, setAdded] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifySubmitting, setNotifySubmitting] = useState(false);
  const [notifySaved, setNotifySaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setMissing(false);

      const { data: prods } = await supabase
        .from("products")
        .select(
          "id,sku,category_id,name_id,name_en,short_description_id,short_description_en,description_id,description_en,price_idr,capacity,weight_grams,attributes,stock_status,product_images(image_url,large_url,thumbnail_url,alt_text_id,alt_text_en,is_primary,sort_order)",
        )
        .ilike("sku", slug)
        .eq("is_active", true)
        .limit(1);

      const prod = prods?.[0] as (Product & { product_images: ProductImage[] }) | undefined;
      if (cancelled) return;
      if (!prod) {
        setMissing(true);
        setLoading(false);
        return;
      }
      const imgs = (prod.product_images ?? []).slice().sort(
        (a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.sort_order - b.sort_order,
      );
      setProduct(prod);
      setImages(imgs);

      if (prod.category_id) {
        const [{ data: cat }, { data: catAttrs }, { data: rel }] = await Promise.all([
          supabase
            .from("categories")
            .select("id,slug,name_id,name_en")
            .eq("id", prod.category_id)
            .maybeSingle(),
          supabase
            .from("category_attributes")
            .select("sort_order, attribute:attributes(id, slug, name_id, name_en, type, unit, options)")
            .eq("category_id", prod.category_id)
            .order("sort_order"),
          supabase
            .from("products")
            .select("id,sku,name_id,name_en,price_idr,product_images(thumbnail_url,image_url,is_primary,sort_order)")
            .eq("category_id", prod.category_id)
            .eq("is_active", true)
            .neq("id", prod.id)
            .limit(4),
        ]);
        if (cancelled) return;
        setCategory((cat as Category) ?? null);
        const defs: AttributeDef[] = ((catAttrs ?? []) as unknown as Array<{ attribute: AttributeDef | null }>)
          .map((r) => r.attribute)
          .filter((a): a is AttributeDef => !!a)
          .map((a) => ({ ...a, options: Array.isArray(a.options) ? a.options : [] }));
        setAttrDefs(defs);
        setRelated(
          (rel ?? []).map((r) => {
            const ri = (r.product_images ?? []) as Array<{
              thumbnail_url: string | null;
              image_url: string;
              is_primary: boolean;
              sort_order: number;
            }>;
            ri.sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.sort_order - b.sort_order);
            const top = ri[0];
            return {
              id: r.id,
              sku: r.sku,
              name_id: r.name_id,
              name_en: r.name_en,
              price_idr: r.price_idr,
              thumb: top ? (top.thumbnail_url ?? top.image_url) : null,
            };
          }),
        );
        // Pre-select existing attribute values from the product so user sees current config.
        const pre: Record<string, string> = {};
        for (const d of defs) {
          const v = prod.attributes?.[d.slug];
          if (v) pre[d.slug] = v;
        }
        setSelectedAttrs(pre);
      }

      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const nameField = useMemo(() => localizedField(product, "name", lang), [product, lang]);
  const shortDescField = useMemo(() => localizedField(product, "short_description", lang), [product, lang]);
  const descField = useMemo(() => localizedField(product, "description", lang), [product, lang]);

  const fallbackLang = product && !hasTranslation(product, ["name", "description"], lang);

  function handleAddToInquiry() {
    if (!product) return;
    const top = images[0];
    addToInquiry({
      productId: product.id,
      slug: product.sku,
      sku: product.sku,
      name_id: product.name_id,
      name_en: product.name_en,
      price_idr: product.price_idr,
      thumbnail: top ? (top.thumbnail_url ?? top.image_url) : null,
      attributes: selectedAttrs,
      quantity,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
    toast.success(t("inquiry.toast_added", { count: quantity }), {
      action: {
        label: t("inquiry.view_inquiry"),
        onClick: () => navigate({ to: (lang === "id" ? "/id/permintaan" : "/en/inquiry") as never }),
      },
    });
  }

  if (missing) throw notFound();

  if (loading || !product) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Nav />
        <div className="flex items-center justify-center py-32 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t("category_detail.loading")}
        </div>
        <Footer />
      </div>
    );
  }

  const stockBadge =
    product.stock_status === "in_stock"
      ? { text: t("labels.in_stock"), cls: "bg-secondary/15 text-secondary border-secondary/30" }
      : product.stock_status === "low_stock"
        ? { text: t("labels.low_stock"), cls: "bg-amber-500/15 text-amber-700 border-amber-500/30" }
        : { text: t("labels.out_of_stock"), cls: "bg-destructive/15 text-destructive border-destructive/30" };

  const isOut = product.stock_status === "out_of_stock";
  const isLow = product.stock_status === "low_stock";

  async function submitNotify(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    const email = notifyEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error(t("product.notify_invalid_email"));
      return;
    }
    setNotifySubmitting(true);
    const { error } = await supabase
      .from("notify_when_in_stock")
      .insert({ product_id: product.id, email });
    setNotifySubmitting(false);
    if (error && !/duplicate|unique/i.test(error.message)) {
      toast.error(error.message);
      return;
    }
    setNotifySaved(true);
    toast.success(t("product.notify_saved"));
  }

  const mainImg = images[activeImage] ?? images[0];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-8 md:py-12">
        {fallbackLang && (
          <div className="mb-4">
            <MissingTranslationNotice otherLang={lang === "id" ? "en" : "id"} />
          </div>
        )}

        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">{t("nav.home")}</Link>
          <span>/</span>
          {category && (
            <>
              <Link to="/catalog" className="hover:text-foreground">
                {localizedField(category, "name", lang).value}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-foreground">{nameField.value}</span>
        </nav>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          {/* Gallery */}
          <div>
            <div className="aspect-square overflow-hidden rounded-2xl border border-border bg-muted">
              {mainImg ? (
                <img
                  src={mainImg.large_url ?? mainImg.image_url}
                  alt={(lang === "id" ? mainImg.alt_text_id : mainImg.alt_text_en) ?? nameField.value}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-wider text-muted-foreground">
                  {t("product.no_image")}
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`aspect-square overflow-hidden rounded-lg border-2 bg-muted transition ${
                      i === activeImage ? "border-primary" : "border-transparent hover:border-border"
                    }`}
                  >
                    <img
                      src={img.thumbnail_url ?? img.image_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col">
            {category && (
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                {localizedField(category, "name", lang).value}
              </p>
            )}
            <h1 className="mt-2 font-[Archivo] text-3xl font-black tracking-tight text-primary md:text-4xl">
              {nameField.value}
            </h1>
            <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
              SKU: {product.sku}
            </p>

            {shortDescField.value && (
              <p className="mt-4 text-base text-muted-foreground">{shortDescField.value}</p>
            )}

            <div className="mt-5 flex items-center gap-3">
              <span className="text-3xl font-bold text-primary">
                {formatPrice(product.price_idr, lang)}
              </span>
              <Badge variant="outline" className={`border ${stockBadge.cls}`}>
                {stockBadge.text}
              </Badge>
            </div>

            {isLow && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-800">
                {t("product.low_stock_notice")}
              </p>
            )}

            {/* Attribute selectors */}
            {attrDefs.length > 0 && (
              <div className="mt-6 space-y-4">
                {attrDefs.map((def) => {
                  const options = def.options?.length
                    ? def.options
                    : product.attributes?.[def.slug]
                      ? [product.attributes[def.slug]]
                      : [];
                  if (options.length === 0) return null;
                  return (
                    <div key={def.id}>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-foreground">
                        {localizedField(def, "name", lang).value}
                        {def.unit ? ` (${def.unit})` : ""}
                      </label>
                      <Select
                        value={selectedAttrs[def.slug] ?? ""}
                        onValueChange={(v) =>
                          setSelectedAttrs((p) => ({ ...p, [def.slug]: v }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("product.select_placeholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          {options.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quantity */}
            <div className="mt-6">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-foreground">
                {t("product.quantity")}
              </label>
              <div className="inline-flex items-center rounded-md border border-input">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-10 w-10 items-center justify-center text-foreground transition hover:bg-muted disabled:opacity-40"
                  disabled={quantity <= 1}
                  aria-label="-"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={quantity}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    setQuantity(Number.isFinite(n) ? Math.min(99, Math.max(1, n)) : 1);
                  }}
                  className="h-10 w-14 border-x border-input bg-transparent text-center text-sm focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                  className="flex h-10 w-10 items-center justify-center text-foreground transition hover:bg-muted disabled:opacity-40"
                  disabled={quantity >= 99}
                  aria-label="+"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-6 space-y-2">
              {!isOut && (
                <Button
                size="lg"
                onClick={handleAddToInquiry}
                className="h-12 w-full bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
                >
                {added ? (
                  <span className="inline-flex items-center gap-2">
                    <Check className="h-4 w-4" /> {t("product.added")}
                  </span>
                ) : (
                  t("cta.add_to_inquiry")
                )}
                </Button>
              )}
              {isOut && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
                    <BellRing className="h-4 w-4" />
                    {t("product.notify_title")}
                  </p>
                  {notifySaved ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t("product.notify_saved")}
                    </p>
                  ) : (
                    <form onSubmit={submitNotify} className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <Input
                        type="email"
                        required
                        placeholder={t("product.notify_email_ph")}
                        value={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.value)}
                        maxLength={255}
                        className="flex-1"
                      />
                      <Button
                        type="submit"
                        disabled={notifySubmitting}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        {notifySubmitting ? t("product.notify_sending") : t("product.notify_cta")}
                      </Button>
                    </form>
                  )}
                </div>
              )}
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 w-full border-primary/30 text-primary"
              >
                <Link to="/stores">
                  <MapPin className="mr-2 h-4 w-4" />
                  {t("product.find_in_store")}
                </Link>
              </Button>
              <p className="pt-1 text-xs leading-relaxed text-muted-foreground">
                {t("product.inquiry_explainer")}
              </p>
            </div>
          </div>
        </div>

        {/* Description + specs */}
        <div className="mt-16 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px]">
          <article>
            <h2 className="font-[Archivo] text-2xl font-bold text-primary">
              {t("product.description")}
            </h2>
            {descField.value ? (
              <div
                className="prose prose-sm mt-4 max-w-none text-foreground/90"
                dangerouslySetInnerHTML={{ __html: descField.value }}
              />
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">{t("product.no_description")}</p>
            )}
          </article>
          <aside>
            <h2 className="font-[Archivo] text-2xl font-bold text-primary">
              {t("product.specs")}
            </h2>
            <dl className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
              <SpecRow label="SKU" value={product.sku} />
              {product.capacity && <SpecRow label={t("product.capacity")} value={product.capacity} />}
              {product.weight_grams && (
                <SpecRow label={t("product.weight")} value={`${product.weight_grams} g`} />
              )}
              {attrDefs.map((d) => {
                const v = product.attributes?.[d.slug];
                if (!v) return null;
                return (
                  <SpecRow
                    key={d.id}
                    label={localizedField(d, "name", lang).value}
                    value={d.unit ? `${v} ${d.unit}` : v}
                  />
                );
              })}
            </dl>
          </aside>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-6 font-[Archivo] text-2xl font-bold text-primary">
              {t("product.related")}
            </h2>
            <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {related.map((r) => {
                const rname = (lang === "id" ? r.name_id : r.name_en) || r.name_id || r.name_en;
                const prefix = lang === "id" ? "produk" : "products";
                return (
                  <li key={r.id}>
                    <Link
                      to={`/${lang}/${prefix}/${r.sku}` as never}
                      className="group block overflow-hidden rounded-xl border border-border bg-card"
                    >
                      <div className="aspect-square overflow-hidden bg-muted">
                        {r.thumb ? (
                          <img
                            src={r.thumb}
                            alt={rname}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        ) : null}
                      </div>
                      <div className="p-3">
                        <p className="line-clamp-2 text-sm font-medium text-foreground">{rname}</p>
                        <p className="mt-1 text-sm font-semibold text-primary">
                          {formatPrice(r.price_idr, lang)}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}