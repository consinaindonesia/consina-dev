
-- page_sections: ordered, enabled sections per page
CREATE TABLE public.page_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page text NOT NULL,
  section_type text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  i18n jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX page_sections_page_position_idx ON public.page_sections (page, position);

GRANT SELECT ON public.page_sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_sections TO authenticated;
GRANT ALL ON public.page_sections TO service_role;

ALTER TABLE public.page_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "page_sections public read" ON public.page_sections
  FOR SELECT USING (true);
CREATE POLICY "page_sections admin write" ON public.page_sections
  FOR ALL TO authenticated
  USING (public.is_admin_or_editor())
  WITH CHECK (public.is_admin_or_editor());

CREATE TRIGGER page_sections_set_updated_at
  BEFORE UPDATE ON public.page_sections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- theme_settings: single-row global theme tokens
CREATE TABLE public.theme_settings (
  id text PRIMARY KEY,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.theme_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.theme_settings TO authenticated;
GRANT ALL ON public.theme_settings TO service_role;

ALTER TABLE public.theme_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "theme_settings public read" ON public.theme_settings
  FOR SELECT USING (true);
CREATE POLICY "theme_settings admin write" ON public.theme_settings
  FOR ALL TO authenticated
  USING (public.is_admin_or_editor())
  WITH CHECK (public.is_admin_or_editor());

CREATE TRIGGER theme_settings_set_updated_at
  BEFORE UPDATE ON public.theme_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
