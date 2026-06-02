
CREATE TABLE public.store_stock (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  stock_quantity integer,
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, product_id)
);

CREATE INDEX idx_store_stock_store ON public.store_stock(store_id);
CREATE INDEX idx_store_stock_product ON public.store_stock(product_id);

GRANT SELECT ON public.store_stock TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_stock TO authenticated;
GRANT ALL ON public.store_stock TO service_role;

ALTER TABLE public.store_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read store_stock for active"
  ON public.store_stock FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_stock.store_id AND s.is_active = true)
    AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = store_stock.product_id AND p.is_active = true)
  );

CREATE POLICY "staff manage store_stock"
  ON public.store_stock FOR ALL
  TO authenticated
  USING (is_admin_or_editor())
  WITH CHECK (is_admin_or_editor());

CREATE TRIGGER trg_store_stock_touch
  BEFORE UPDATE ON public.store_stock
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
