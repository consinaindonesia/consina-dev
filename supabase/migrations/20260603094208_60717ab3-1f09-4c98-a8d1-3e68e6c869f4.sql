CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  color_name text NOT NULL,
  color_hex text NOT NULL,
  image_url text,
  stock integer,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_variants_color_hex_format CHECK (color_hex ~* '^#[0-9a-f]{6}$')
);

CREATE INDEX idx_product_variants_product ON public.product_variants(product_id, sort_order);

GRANT SELECT ON public.product_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read product_variants of active products"
ON public.product_variants
FOR SELECT
TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_variants.product_id AND p.is_active = true));

CREATE POLICY "staff manage product_variants"
ON public.product_variants
FOR ALL
TO authenticated
USING (is_admin_or_editor())
WITH CHECK (is_admin_or_editor());

CREATE TRIGGER product_variants_set_updated_at
BEFORE UPDATE ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();