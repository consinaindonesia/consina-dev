
-- attributes
CREATE TABLE IF NOT EXISTS public.attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_id text NOT NULL,
  name_en text NOT NULL,
  type text NOT NULL CHECK (type IN ('text','number','select')),
  unit text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_attributes_updated_at
BEFORE UPDATE ON public.attributes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read attributes"
  ON public.attributes FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "staff manage attributes"
  ON public.attributes FOR ALL TO authenticated
  USING (public.is_admin_or_editor())
  WITH CHECK (public.is_admin_or_editor());

CREATE TRIGGER trg_attributes_log
AFTER INSERT OR UPDATE OR DELETE ON public.attributes
FOR EACH ROW EXECUTE FUNCTION public.log_entity_change('attribute');

-- category_attributes
CREATE TABLE IF NOT EXISTS public.category_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  attribute_id uuid NOT NULL REFERENCES public.attributes(id) ON DELETE CASCADE,
  is_required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  UNIQUE (category_id, attribute_id)
);

CREATE INDEX IF NOT EXISTS idx_category_attributes_category
  ON public.category_attributes(category_id);
CREATE INDEX IF NOT EXISTS idx_category_attributes_attribute
  ON public.category_attributes(attribute_id);

ALTER TABLE public.category_attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read category_attributes"
  ON public.category_attributes FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "staff manage category_attributes"
  ON public.category_attributes FOR ALL TO authenticated
  USING (public.is_admin_or_editor())
  WITH CHECK (public.is_admin_or_editor());

CREATE TRIGGER trg_category_attributes_log
AFTER INSERT OR UPDATE OR DELETE ON public.category_attributes
FOR EACH ROW EXECUTE FUNCTION public.log_entity_change('category_attribute');
