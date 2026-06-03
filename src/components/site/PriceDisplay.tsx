import { formatPrice } from "@/i18n/format";
import type { Lang } from "@/i18n";

export type PriceDisplayProduct = {
  price_idr: number;
  original_price_idr?: number | null;
  sale_price_idr?: number | null;
  is_on_sale?: boolean | null;
  discount_percent?: number | string | null;
  size_variants?: Array<{
    price_idr: number | null;
    original_price_idr: number | null;
    stock: number | null;
  }> | null;
};

function discountPct(original: number, current: number): number {
  if (!original || original <= current) return 0;
  return Math.round(((original - current) / original) * 100);
}

/**
 * Resolve the effective price range + sale state for a product.
 * Considers size_variants overriding the base price, and per-product sale_price.
 */
export function resolvePricing(p: PriceDisplayProduct) {
  const variantPrices = (p.size_variants ?? [])
    .map((v) => (typeof v.price_idr === "number" ? v.price_idr : null))
    .filter((n): n is number => typeof n === "number" && n > 0);

  // Effective "current" price for the base product (sale wins when present).
  const baseCurrent =
    typeof p.sale_price_idr === "number" && p.sale_price_idr > 0
      ? p.sale_price_idr
      : p.price_idr;
  const baseOriginal =
    typeof p.sale_price_idr === "number" && p.sale_price_idr > 0
      ? p.price_idr || p.original_price_idr || null
      : typeof p.original_price_idr === "number" && p.original_price_idr > p.price_idr
        ? p.original_price_idr
        : null;

  const allCurrent = variantPrices.length > 0 ? variantPrices : [baseCurrent];
  const min = Math.min(...allCurrent);
  const max = Math.max(...allCurrent);

  const onSale =
    !!p.is_on_sale ||
    (baseOriginal !== null && baseOriginal > baseCurrent) ||
    (p.size_variants ?? []).some(
      (v) =>
        typeof v.price_idr === "number" &&
        typeof v.original_price_idr === "number" &&
        v.original_price_idr > v.price_idr,
    );

  const explicitPct =
    p.discount_percent === null || p.discount_percent === undefined
      ? null
      : Number(p.discount_percent);
  const derivedPct = baseOriginal ? discountPct(baseOriginal, baseCurrent) : 0;
  const badgePct =
    explicitPct !== null && Number.isFinite(explicitPct) && explicitPct > 0
      ? explicitPct
      : derivedPct;

  return {
    min,
    max,
    hasRange: min !== max,
    current: baseCurrent,
    original: baseOriginal,
    onSale,
    discount: badgePct,
  };
}

export function PriceDisplay({
  product,
  lang,
  size = "sm",
  className = "",
}: {
  product: PriceDisplayProduct;
  lang: Lang;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const r = resolvePricing(product);
  const priceCls =
    size === "lg" ? "text-3xl font-bold" : size === "md" ? "text-base font-semibold" : "text-sm font-semibold";
  const strikeCls =
    size === "lg" ? "text-base" : size === "md" ? "text-sm" : "text-xs";

  if (r.hasRange) {
    return (
      <div className={`flex flex-wrap items-baseline gap-2 ${className}`}>
        <span className={`${priceCls} text-primary`}>
          {formatPrice(r.min, lang)} – {formatPrice(r.max, lang)}
        </span>
        {r.onSale && r.discount > 0 && <DiscountBadge pct={r.discount} />}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-baseline gap-2 ${className}`}>
      <span className={`${priceCls} text-primary`}>{formatPrice(r.current, lang)}</span>
      {r.original && r.original > r.current && (
        <span className={`${strikeCls} text-muted-foreground line-through`}>
          {formatPrice(r.original, lang)}
        </span>
      )}
      {r.onSale && r.discount > 0 && <DiscountBadge pct={r.discount} />}
    </div>
  );
}

function DiscountBadge({ pct }: { pct: number }) {
  const display = Number.isInteger(pct) ? pct.toString() : pct.toFixed(1);
  return (
    <span className="inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
      -{display}%
    </span>
  );
}