-- Clean orphans before adding FKs
DELETE FROM public.product_size_variants WHERE product_id NOT IN (SELECT id FROM public.products);
DELETE FROM public.product_option_types WHERE product_id NOT IN (SELECT id FROM public.products);
DELETE FROM public.product_option_values WHERE option_type_id NOT IN (SELECT id FROM public.product_option_types);
DELETE FROM public.category_size_guides WHERE size_guide_id NOT IN (SELECT id FROM public.size_guides) OR category_id NOT IN (SELECT id FROM public.categories);

-- Add FKs so PostgREST can do embedded joins
ALTER TABLE public.product_size_variants
  ADD CONSTRAINT product_size_variants_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.product_option_types
  ADD CONSTRAINT product_option_types_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.product_option_values
  ADD CONSTRAINT product_option_values_option_type_id_fkey
  FOREIGN KEY (option_type_id) REFERENCES public.product_option_types(id) ON DELETE CASCADE;

ALTER TABLE public.category_size_guides
  ADD CONSTRAINT category_size_guides_size_guide_id_fkey
  FOREIGN KEY (size_guide_id) REFERENCES public.size_guides(id) ON DELETE CASCADE,
  ADD CONSTRAINT category_size_guides_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;

-- Optional: also link products.size_guide_id properly
ALTER TABLE public.products
  ADD CONSTRAINT products_size_guide_id_fkey
  FOREIGN KEY (size_guide_id) REFERENCES public.size_guides(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_size_variants_product_id ON public.product_size_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_option_types_product_id ON public.product_option_types(product_id);
CREATE INDEX IF NOT EXISTS idx_product_option_values_option_type_id ON public.product_option_values(option_type_id);