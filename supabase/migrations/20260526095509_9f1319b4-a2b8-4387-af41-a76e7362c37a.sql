
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS description_id text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.stores
  ALTER COLUMN opening_hours TYPE jsonb USING
    CASE
      WHEN opening_hours IS NULL OR opening_hours = '' THEN NULL
      ELSE to_jsonb(opening_hours)
    END;

DROP TRIGGER IF EXISTS stores_set_updated_at ON public.stores;
CREATE TRIGGER stores_set_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
