
-- 1. Many-to-many join table
CREATE TABLE IF NOT EXISTS public.product_categories (
  product_id  uuid NOT NULL REFERENCES public.products(id)   ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  is_primary  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_product_categories_category ON public.product_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_product  ON public.product_categories(product_id);

GRANT SELECT ON public.product_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_categories TO authenticated;
GRANT ALL ON public.product_categories TO service_role;

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read active product categories" ON public.product_categories;
CREATE POLICY "public read active product categories"
  ON public.product_categories
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_categories.product_id AND p.is_active = true
    )
  );

DROP POLICY IF EXISTS "staff manage product categories" ON public.product_categories;
CREATE POLICY "staff manage product categories"
  ON public.product_categories
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_editor())
  WITH CHECK (public.is_admin_or_editor());

-- 2. Backfill existing primary categories
INSERT INTO public.product_categories (product_id, category_id, is_primary)
SELECT p.id, p.category_id, true
FROM public.products p
WHERE p.category_id IS NOT NULL
ON CONFLICT (product_id, category_id) DO UPDATE SET is_primary = EXCLUDED.is_primary;

-- 3. Seed Activities taxonomy (idempotent)
INSERT INTO public.categories (slug, name_id, name_en, sort_order, is_active)
VALUES ('activities', 'Aktivitas', 'Activities', 100, true)
ON CONFLICT (slug) DO NOTHING;

WITH parent AS (SELECT id FROM public.categories WHERE slug = 'activities')
INSERT INTO public.categories (slug, name_id, name_en, parent_category_id, sort_order, is_active)
SELECT v.slug, v.name_id, v.name_en, parent.id, v.sort_order, true
FROM parent,
     (VALUES
       ('hiking',      'Hiking',      'Hiking',      1),
       ('running',     'Lari',        'Running',     2),
       ('urban',       'Urban',       'Urban',       3),
       ('camping',     'Kemping',     'Camping',     4),
       ('travelling',  'Traveling',   'Travelling',  5)
     ) AS v(slug, name_id, name_en, sort_order)
ON CONFLICT (slug) DO NOTHING;
