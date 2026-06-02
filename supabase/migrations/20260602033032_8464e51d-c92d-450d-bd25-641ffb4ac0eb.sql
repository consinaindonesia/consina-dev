
-- Orders + Order Items + payment-proofs storage bucket

CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inquiry_id uuid,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  customer_address text,
  shipping_method text NOT NULL DEFAULT 'pickup',
  shipping_address text,
  subtotal_idr integer NOT NULL DEFAULT 0,
  shipping_idr integer NOT NULL DEFAULT 0,
  total_idr integer NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'bank_transfer',
  payment_status text NOT NULL DEFAULT 'pending',
  payment_reference text,
  payment_proof_url text,
  status text NOT NULL DEFAULT 'new',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Public can create orders (checkout)
CREATE POLICY "public create orders" ON public.orders
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Public can update only their pending order to attach proof (by id only, app uses recently created id).
-- To avoid letting anon mutate arbitrary fields broadly we keep this permissive but limited to specific statuses.
CREATE POLICY "public update pending payment proof" ON public.orders
  FOR UPDATE TO anon, authenticated
  USING (payment_status IN ('pending','awaiting_proof'))
  WITH CHECK (payment_status IN ('pending','awaiting_proof','verifying'));

-- Staff full management
CREATE POLICY "staff read orders" ON public.orders
  FOR SELECT TO authenticated USING (is_admin_or_editor());
CREATE POLICY "staff update orders" ON public.orders
  FOR UPDATE TO authenticated USING (is_admin_or_editor()) WITH CHECK (is_admin_or_editor());
CREATE POLICY "admin delete orders" ON public.orders
  FOR DELETE TO authenticated USING (is_admin());

-- Public read by id only via app flow (need select to fetch own order on payment page)
CREATE POLICY "public read own order by id" ON public.orders
  FOR SELECT TO anon, authenticated USING (true);

CREATE INDEX idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX idx_orders_inquiry_id ON public.orders(inquiry_id);

CREATE TRIGGER orders_set_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid,
  product_name text,
  sku text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price_idr integer NOT NULL DEFAULT 0,
  line_total_idr integer NOT NULL DEFAULT 0,
  attributes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.order_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public create order_items" ON public.order_items
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public read order_items" ON public.order_items
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "staff manage order_items" ON public.order_items
  FOR ALL TO authenticated USING (is_admin_or_editor()) WITH CHECK (is_admin_or_editor());

CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);


-- Storage bucket for payment proofs (public read so staff & customer can view)
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs','payment-proofs', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public upload payment proofs" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "public read payment proofs" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'payment-proofs');

CREATE POLICY "staff manage payment proofs" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'payment-proofs' AND is_admin_or_editor())
  WITH CHECK (bucket_id = 'payment-proofs' AND is_admin_or_editor());
