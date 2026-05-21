
ALTER TABLE public.activity_log DROP CONSTRAINT IF EXISTS activity_log_entity_type_check;
ALTER TABLE public.activity_log ADD CONSTRAINT activity_log_entity_type_check
  CHECK (entity_type = ANY (ARRAY['product','category','inquiry','store','admin_user','attribute','category_attribute']));

INSERT INTO public.categories (slug, name_id, name_en, sort_order)
VALUES
  ('tents', 'Tenda', 'Tents', 10),
  ('apparel', 'Pakaian', 'Apparel', 20),
  ('accessories', 'Aksesori', 'Accessories', 30),
  ('footwear', 'Alas Kaki', 'Footwear', 40)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.attributes (slug, name_id, name_en, type, unit, options) VALUES
  ('capacity_liters', 'Kapasitas', 'Capacity', 'number', 'L', '[]'::jsonb),
  ('tent_capacity', 'Kapasitas Tenda', 'Tent Capacity', 'select', NULL, '["1P","2P","3P","4P","6P"]'::jsonb),
  ('season_rating', 'Rating Musim', 'Season Rating', 'select', NULL, '["3-season","4-season"]'::jsonb),
  ('size', 'Ukuran', 'Size', 'select', NULL, '["XS","S","M","L","XL","XXL"]'::jsonb),
  ('color', 'Warna', 'Color', 'select', NULL, '["Black","White","Gray","Navy","Blue","Red","Green","Olive","Khaki","Brown","Beige","Yellow","Orange","Purple","Pink"]'::jsonb),
  ('gender', 'Gender', 'Gender', 'select', NULL, '["Men","Women","Unisex"]'::jsonb),
  ('material', 'Material', 'Material', 'text', NULL, '[]'::jsonb),
  ('weight', 'Berat', 'Weight', 'number', 'g', '[]'::jsonb),
  ('shoe_size_eu', 'Ukuran Sepatu (EU)', 'Shoe Size (EU)', 'number', NULL, '[]'::jsonb)
ON CONFLICT (slug) DO NOTHING;

WITH a AS (SELECT id, slug FROM public.attributes),
     c AS (SELECT id, slug FROM public.categories)
INSERT INTO public.category_attributes (category_id, attribute_id, is_required, sort_order)
SELECT c.id, a.id, x.is_required, x.sort_order
FROM (VALUES
  ('carriers',    'capacity_liters', true,  10),
  ('tents',       'tent_capacity',   true,  10),
  ('tents',       'season_rating',   false, 20),
  ('apparel',     'size',            true,  10),
  ('apparel',     'color',           false, 20),
  ('apparel',     'gender',          false, 30),
  ('accessories', 'color',           false, 20),
  ('footwear',    'gender',          false, 30),
  ('footwear',    'size',            true,  10),
  ('footwear',    'shoe_size_eu',    false, 15),
  ('carriers',    'material',        false, 90),
  ('carriers',    'weight',          false, 91),
  ('tents',       'material',        false, 90),
  ('tents',       'weight',          false, 91),
  ('apparel',     'material',        false, 90),
  ('apparel',     'weight',          false, 91),
  ('accessories', 'material',        false, 90),
  ('accessories', 'weight',          false, 91),
  ('footwear',    'material',        false, 90),
  ('footwear',    'weight',          false, 91)
) AS x(cat_slug, attr_slug, is_required, sort_order)
JOIN c ON c.slug = x.cat_slug
JOIN a ON a.slug = x.attr_slug
ON CONFLICT DO NOTHING;
