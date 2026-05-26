-- Soft delete and closing context on inquiries
ALTER TABLE public.inquiries
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS closing_notes text,
  ADD COLUMN IF NOT EXISTS lost_reason text;

CREATE INDEX IF NOT EXISTS inquiries_deleted_at_idx ON public.inquiries (deleted_at);

-- Internal notes (admin-only, not visible to customer)
CREATE TABLE IF NOT EXISTS public.inquiry_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES public.inquiries(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inquiry_notes_inquiry_id_idx ON public.inquiry_notes (inquiry_id, created_at DESC);

ALTER TABLE public.inquiry_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff read inquiry_notes" ON public.inquiry_notes;
CREATE POLICY "staff read inquiry_notes"
  ON public.inquiry_notes FOR SELECT
  TO authenticated
  USING (is_admin_or_editor());

DROP POLICY IF EXISTS "staff insert inquiry_notes" ON public.inquiry_notes;
CREATE POLICY "staff insert inquiry_notes"
  ON public.inquiry_notes FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_or_editor());

DROP POLICY IF EXISTS "admins delete inquiry_notes" ON public.inquiry_notes;
CREATE POLICY "admins delete inquiry_notes"
  ON public.inquiry_notes FOR DELETE
  TO authenticated
  USING (is_admin());