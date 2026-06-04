
CREATE TABLE public.voucher_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value integer NOT NULL CHECK (discount_value > 0),
  min_spend_idr integer NOT NULL DEFAULT 0,
  usage_limit integer,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.voucher_codes TO authenticated;
GRANT ALL ON public.voucher_codes TO service_role;

ALTER TABLE public.voucher_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read voucher_codes" ON public.voucher_codes
  FOR SELECT TO authenticated USING (public.is_admin_or_editor());
CREATE POLICY "staff manage voucher_codes" ON public.voucher_codes
  FOR ALL TO authenticated USING (public.is_admin_or_editor()) WITH CHECK (public.is_admin_or_editor());

CREATE TRIGGER set_voucher_codes_updated_at
  BEFORE UPDATE ON public.voucher_codes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_voucher_codes_code ON public.voucher_codes (code);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS voucher_code text,
  ADD COLUMN IF NOT EXISTS voucher_discount_idr integer NOT NULL DEFAULT 0;
