
-- 1. parent category
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS parent_category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories(parent_category_id);

-- 2. slug redirect log
CREATE TABLE IF NOT EXISTS public.category_slug_redirects (
  old_slug text PRIMARY KEY,
  new_slug text NOT NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.category_slug_redirects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read slug redirects" ON public.category_slug_redirects;
CREATE POLICY "public read slug redirects"
  ON public.category_slug_redirects FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "staff manage slug redirects" ON public.category_slug_redirects;
CREATE POLICY "staff manage slug redirects"
  ON public.category_slug_redirects FOR ALL
  TO authenticated
  USING (public.is_admin_or_editor())
  WITH CHECK (public.is_admin_or_editor());

-- 3. trigger: log slug change & remap any old redirect that pointed at the old slug
CREATE OR REPLACE FUNCTION public.log_category_slug_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS DISTINCT FROM OLD.slug THEN
    -- remove a redirect that would conflict with the new slug
    DELETE FROM public.category_slug_redirects WHERE old_slug = NEW.slug;
    -- record OLD -> NEW
    INSERT INTO public.category_slug_redirects (old_slug, new_slug, category_id)
    VALUES (OLD.slug, NEW.slug, NEW.id)
    ON CONFLICT (old_slug) DO UPDATE SET new_slug = EXCLUDED.new_slug, category_id = EXCLUDED.category_id;
    -- update any chained redirects so they point at the latest slug
    UPDATE public.category_slug_redirects
       SET new_slug = NEW.slug
     WHERE new_slug = OLD.slug AND old_slug <> NEW.slug;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_category_slug_change ON public.categories;
CREATE TRIGGER trg_log_category_slug_change
AFTER UPDATE OF slug ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.log_category_slug_change();

-- 4. storage bucket for category images
INSERT INTO storage.buckets (id, name, public)
VALUES ('category-images', 'category-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public read category images" ON storage.objects;
CREATE POLICY "public read category images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'category-images');

DROP POLICY IF EXISTS "staff write category images" ON storage.objects;
CREATE POLICY "staff write category images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'category-images' AND public.is_admin_or_editor());

DROP POLICY IF EXISTS "staff update category images" ON storage.objects;
CREATE POLICY "staff update category images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'category-images' AND public.is_admin_or_editor())
  WITH CHECK (bucket_id = 'category-images' AND public.is_admin_or_editor());

DROP POLICY IF EXISTS "staff delete category images" ON storage.objects;
CREATE POLICY "staff delete category images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'category-images' AND public.is_admin_or_editor());
