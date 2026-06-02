-- Shipping zones (manual rates per region)
CREATE TABLE public.shipping_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_name text NOT NULL,
  cities text[] NOT NULL DEFAULT '{}'::text[],
  is_default boolean NOT NULL DEFAULT false,
  base_cost_idr integer NOT NULL DEFAULT 0,
  per_kg_cost_idr integer NOT NULL DEFAULT 0,
  delivery_days_min integer NOT NULL DEFAULT 1,
  delivery_days_max integer NOT NULL DEFAULT 7,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.shipping_zones TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipping_zones TO authenticated;
GRANT ALL ON public.shipping_zones TO service_role;

ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read active shipping_zones"
ON public.shipping_zones FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "staff manage shipping_zones"
ON public.shipping_zones FOR ALL
TO authenticated
USING (is_admin_or_editor())
WITH CHECK (is_admin_or_editor());

CREATE TRIGGER shipping_zones_updated
BEFORE UPDATE ON public.shipping_zones
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Ensure at most one default zone
CREATE UNIQUE INDEX shipping_zones_single_default
  ON public.shipping_zones ((1)) WHERE is_default = true;

-- Shipping methods (carriers / service levels)
CREATE TABLE public.shipping_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  multiplier numeric NOT NULL DEFAULT 1.0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.shipping_methods TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipping_methods TO authenticated;
GRANT ALL ON public.shipping_methods TO service_role;

ALTER TABLE public.shipping_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read active shipping_methods"
ON public.shipping_methods FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "staff manage shipping_methods"
ON public.shipping_methods FOR ALL
TO authenticated
USING (is_admin_or_editor())
WITH CHECK (is_admin_or_editor());

CREATE TRIGGER shipping_methods_updated
BEFORE UPDATE ON public.shipping_methods
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Extend orders with shipping method + fulfillment fields
ALTER TABLE public.orders
  ADD COLUMN shipping_method_id uuid,
  ADD COLUMN shipping_method_name text,
  ADD COLUMN shipping_zone_id uuid,
  ADD COLUMN shipping_city text,
  ADD COLUMN shipping_postal_code text,
  ADD COLUMN tracking_number text,
  ADD COLUMN tracking_carrier text,
  ADD COLUMN shipped_at timestamptz;

-- Seed a default zone + a few common methods so checkout works immediately.
INSERT INTO public.shipping_zones
  (region_name, cities, is_default, base_cost_idr, per_kg_cost_idr, delivery_days_min, delivery_days_max, sort_order)
VALUES
  ('Jabodetabek',  ARRAY['jakarta','bogor','depok','tangerang','bekasi'], false, 15000, 5000, 1, 2, 1),
  ('Jawa',         ARRAY['bandung','semarang','surabaya','yogyakarta','solo','malang'], false, 25000, 8000, 2, 4, 2),
  ('Luar Jawa',    ARRAY[]::text[], true,  40000, 15000, 3, 7, 3);

INSERT INTO public.shipping_methods (name, code, multiplier, sort_order) VALUES
  ('JNE Regular',   'jne_reg', 1.0, 1),
  ('J&T Express',   'jnt_exp', 1.1, 2),
  ('Anteraja',      'anteraja', 0.95, 3);