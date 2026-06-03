-- Promo pricing on products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS original_price_idr integer NULL,
  ADD COLUMN IF NOT EXISTS sale_price_idr integer NULL,
  ADD COLUMN IF NOT EXISTS is_on_sale boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS size_guide_id uuid NULL;

CREATE INDEX IF NOT EXISTS idx_products_is_on_sale ON public.products(is_on_sale) WHERE is_on_sale = true;

-- Option types per product (e.g. "Ukuran")
CREATE TABLE public.product_option_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pot_product ON public.product_option_types(product_id);
GRANT SELECT ON public.product_option_types TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_option_types TO authenticated;
GRANT ALL ON public.product_option_types TO service_role;
ALTER TABLE public.product_option_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read option_types of active products" ON public.product_option_types
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM products p WHERE p.id = product_option_types.product_id AND p.is_active = true));
CREATE POLICY "staff manage option_types" ON public.product_option_types
  FOR ALL TO authenticated USING (is_admin_or_editor()) WITH CHECK (is_admin_or_editor());

-- Free-text option values
CREATE TABLE public.product_option_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  option_type_id uuid NOT NULL,
  value text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pov_type ON public.product_option_values(option_type_id);
GRANT SELECT ON public.product_option_values TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_option_values TO authenticated;
GRANT ALL ON public.product_option_values TO service_role;
ALTER TABLE public.product_option_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read option_values of active products" ON public.product_option_values
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM product_option_types t
    JOIN products p ON p.id = t.product_id
    WHERE t.id = product_option_values.option_type_id AND p.is_active = true
  ));
CREATE POLICY "staff manage option_values" ON public.product_option_values
  FOR ALL TO authenticated USING (is_admin_or_editor()) WITH CHECK (is_admin_or_editor());

-- Size/option combinations (separate from color variants)
CREATE TABLE public.product_size_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  option_value_ids uuid[] NOT NULL DEFAULT '{}',
  sku text NULL,
  price_idr integer NULL,
  original_price_idr integer NULL,
  stock integer NOT NULL DEFAULT 0,
  image_url text NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_psv_product ON public.product_size_variants(product_id);
GRANT SELECT ON public.product_size_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_size_variants TO authenticated;
GRANT ALL ON public.product_size_variants TO service_role;
ALTER TABLE public.product_size_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read size_variants of active products" ON public.product_size_variants
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM products p WHERE p.id = product_size_variants.product_id AND p.is_active = true));
CREATE POLICY "staff manage size_variants" ON public.product_size_variants
  FOR ALL TO authenticated USING (is_admin_or_editor()) WITH CHECK (is_admin_or_editor());
CREATE TRIGGER trg_psv_updated_at BEFORE UPDATE ON public.product_size_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Size guides
CREATE TABLE public.size_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NULL,
  headers jsonb NOT NULL DEFAULT '[]'::jsonb,
  rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.size_guides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.size_guides TO authenticated;
GRANT ALL ON public.size_guides TO service_role;
ALTER TABLE public.size_guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read size_guides" ON public.size_guides
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "staff manage size_guides" ON public.size_guides
  FOR ALL TO authenticated USING (is_admin_or_editor()) WITH CHECK (is_admin_or_editor());
CREATE TRIGGER trg_sg_updated_at BEFORE UPDATE ON public.size_guides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Category → size guide mapping
CREATE TABLE public.category_size_guides (
  category_id uuid PRIMARY KEY,
  size_guide_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.category_size_guides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.category_size_guides TO authenticated;
GRANT ALL ON public.category_size_guides TO service_role;
ALTER TABLE public.category_size_guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read category_size_guides" ON public.category_size_guides
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "staff manage category_size_guides" ON public.category_size_guides
  FOR ALL TO authenticated USING (is_admin_or_editor()) WITH CHECK (is_admin_or_editor());
