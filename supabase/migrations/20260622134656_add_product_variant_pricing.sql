ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS price_idr integer,
  ADD COLUMN IF NOT EXISTS original_price_idr integer,
  ADD COLUMN IF NOT EXISTS sale_price_idr integer;

ALTER TABLE public.product_variants
  ADD CONSTRAINT product_variants_price_idr_nonnegative
    CHECK (price_idr IS NULL OR price_idr >= 0),
  ADD CONSTRAINT product_variants_original_price_idr_nonnegative
    CHECK (original_price_idr IS NULL OR original_price_idr >= 0),
  ADD CONSTRAINT product_variants_sale_price_idr_nonnegative
    CHECK (sale_price_idr IS NULL OR sale_price_idr >= 0);

UPDATE public.product_variants pv
SET
  price_idr = COALESCE(pv.price_idr, p.price_idr),
  original_price_idr = COALESCE(pv.original_price_idr, p.original_price_idr, p.price_idr),
  sale_price_idr = COALESCE(pv.sale_price_idr, p.sale_price_idr)
FROM public.products p
WHERE p.id = pv.product_id
  AND (
    pv.price_idr IS NULL
    OR pv.original_price_idr IS NULL
    OR pv.sale_price_idr IS NULL
  );
