CREATE TABLE public.brand_glossary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term_en text NOT NULL,
  term_id text,
  never_translate boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_glossary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read brand_glossary"
ON public.brand_glossary FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "staff manage brand_glossary"
ON public.brand_glossary FOR ALL
TO authenticated
USING (public.is_admin_or_editor())
WITH CHECK (public.is_admin_or_editor());

CREATE TRIGGER brand_glossary_set_updated_at
BEFORE UPDATE ON public.brand_glossary
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.brand_glossary (term_en, term_id, never_translate, notes) VALUES
  ('Consina', NULL, true, 'Brand name'),
  ('Inspired by Experience', NULL, true, 'Tagline'),
  ('Responsible Trekker', NULL, true, 'Brand concept'),
  ('The Outdoor Lifestyle', NULL, true, 'Brand concept'),
  ('Carrier', 'Tas Carrier', false, 'Use Tas Carrier when translating to Indonesian');
