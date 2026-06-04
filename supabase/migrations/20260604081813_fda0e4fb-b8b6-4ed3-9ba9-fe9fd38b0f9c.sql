
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stock_decremented_at timestamptz;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS size_variant_id uuid REFERENCES public.product_size_variants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON public.order_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_order_items_size_variant_id ON public.order_items(size_variant_id);
