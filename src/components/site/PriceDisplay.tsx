import { formatPrice } from "@/i18n/format";
import type { Lang } from "@/i18n";

export type PriceDisplayProduct = {
  price_idr: number;
  original_price_idr?: number | null;
  sale_price_idr?: number | null;
  is_on_sale?: boolean | null;
  discount_percent?: number | string | null;
  color_variants?: Array<{
    price_idr: number | null;
    original_price_idr: number | null;
    sale_price_idr?: number | null;
    stock?: number | null;
  }> | null;
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
  const colorEntries = (p.color_variants ?? [])
    .map((v) => {
      const current =
        typeof v.sale_price_idr === "number" && v.sale_price_idr > 0
          ? v.sale_price_idr
          : typeof v.price_idr === "number" && v.price_idr > 0
            ? v.price_idr
            : null;
      if (current === null) return null;
      const original =
        typeof v.sale_price_idr === "number" && v.sale_price_idr > 0
          ? v.price_idr || v.original_price_idr || null
          : typeof v.original_price_idr === "number" && v.original_price_idr > current
            ? v.original_price_idr
            : null;
      return { current, original };
    })
    .filter((v): v is { current: number; original: number | null } => v !== null);

  const sizeEntries = (p.size_variants ?? [])
    .map((v) => {
      if (typeof v.price_idr !== "number" || v.price_idr <= 0) return null;
      const original =
        typeof v.original_price_idr === "number" && v.original_price_idr > v.price_idr
          ? v.original_price_idr
          : null;
      return { current: v.price_idr, original };
    })
    .filter((v): v is { current: number; original: number | null } => v !== null);

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

  const effectiveEntries =
    sizeEntries.length > 0
      ? sizeEntries
      : colorEntries.length > 0
        ? colorEntries
        : [{ current: baseCurrent, original: baseOriginal }];
  const allCurrent = effectiveEntries.map((entry) => entry.current);
  const min = Math.min(...allCurrent);
  const max = Math.max(...allCurrent);
  const singleEntry =
    effectiveEntries.length === 1 ? effectiveEntries[0] : { current: baseCurrent, original: baseOriginal };

  const onSale =
    !!p.is_on_sale ||
    (baseOriginal !== null && baseOriginal > baseCurrent) ||
    colorEntries.some((v) => v.original !== null && v.original > v.current) ||
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
  const derivedPct = singleEntry.original ? discountPct(singleEntry.original, singleEntry.current) : 0;
  const badgePct =
    explicitPct !== null && Number.isFinite(explicitPct) && explicitPct > 0
      ? explicitPct
      : derivedPct;

  return {
    min,
    max,
    hasRange: min !== max,
    current: singleEntry.current,
    original: singleEntry.original,
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
