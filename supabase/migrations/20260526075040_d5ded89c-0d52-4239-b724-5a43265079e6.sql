ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS ai_translated_fields text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS products_ai_translated_fields_idx
  ON public.products USING gin (ai_translated_fields);