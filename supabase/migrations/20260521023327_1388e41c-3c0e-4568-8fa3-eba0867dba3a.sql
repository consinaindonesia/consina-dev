
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS short_description_id text,
  ADD COLUMN IF NOT EXISTS short_description_en text;
