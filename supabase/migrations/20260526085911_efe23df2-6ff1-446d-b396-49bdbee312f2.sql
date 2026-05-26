CREATE TABLE public.notify_when_in_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  email text NOT NULL,
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX notify_when_in_stock_product_email_uq
  ON public.notify_when_in_stock (product_id, lower(email))
  WHERE notified_at IS NULL;

CREATE INDEX notify_when_in_stock_pending_idx
  ON public.notify_when_in_stock (product_id)
  WHERE notified_at IS NULL;

ALTER TABLE public.notify_when_in_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public submit notify_when_in_stock"
  ON public.notify_when_in_stock
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "staff read notify_when_in_stock"
  ON public.notify_when_in_stock
  FOR SELECT TO authenticated
  USING (is_admin_or_editor());

CREATE POLICY "staff update notify_when_in_stock"
  ON public.notify_when_in_stock
  FOR UPDATE TO authenticated
  USING (is_admin_or_editor())
  WITH CHECK (is_admin_or_editor());

CREATE POLICY "admins delete notify_when_in_stock"
  ON public.notify_when_in_stock
  FOR DELETE TO authenticated
  USING (is_admin());