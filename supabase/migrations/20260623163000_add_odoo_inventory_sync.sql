ALTER TABLE public.activity_log DROP CONSTRAINT IF EXISTS activity_log_action_check;
ALTER TABLE public.activity_log ADD CONSTRAINT activity_log_action_check
  CHECK (action = ANY (ARRAY[
    'created','updated','deleted',
    'login_success','login_failed',
    'password_reset_requested','password_changed',
    'role_changed','status_changed',
    'bulk_import','bulk_delete','bulk_translate',
    'settings_changed','user_deactivated',
    'sla_first_contact','sla_breach_first_contact',
    'sync_received','sync_applied','sync_failed'
  ]));

ALTER TABLE public.activity_log DROP CONSTRAINT IF EXISTS activity_log_entity_type_check;
ALTER TABLE public.activity_log ADD CONSTRAINT activity_log_entity_type_check
  CHECK (entity_type = ANY (ARRAY[
    'product','category','inquiry','store','admin_user',
    'attribute','category_attribute',
    'auth','setting','bulk','order','shipping_method','shipping_zone',
    'inventory_sync'
  ]));

CREATE TABLE public.odoo_product_map (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  odoo_sku text NOT NULL UNIQUE,
  odoo_product_id text,
  odoo_variant_id text,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
  size_variant_id uuid REFERENCES public.product_size_variants(id) ON DELETE CASCADE,
  sync_priority integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT odoo_product_map_target_check CHECK (
    product_id IS NOT NULL OR variant_id IS NOT NULL OR size_variant_id IS NOT NULL
  )
);

CREATE INDEX idx_odoo_product_map_product_id ON public.odoo_product_map(product_id);
CREATE INDEX idx_odoo_product_map_variant_id ON public.odoo_product_map(variant_id);
CREATE INDEX idx_odoo_product_map_size_variant_id ON public.odoo_product_map(size_variant_id);
CREATE INDEX idx_odoo_product_map_active ON public.odoo_product_map(is_active, sync_priority);

GRANT SELECT ON public.odoo_product_map TO authenticated;
GRANT ALL ON public.odoo_product_map TO service_role;

ALTER TABLE public.odoo_product_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read odoo_product_map"
  ON public.odoo_product_map FOR SELECT
  TO authenticated
  USING (is_admin_or_editor());

CREATE POLICY "staff manage odoo_product_map"
  ON public.odoo_product_map FOR ALL
  TO authenticated
  USING (is_admin_or_editor())
  WITH CHECK (is_admin_or_editor());

CREATE TRIGGER trg_odoo_product_map_touch
  BEFORE UPDATE ON public.odoo_product_map
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.inventory_sync_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source text NOT NULL DEFAULT 'odoo',
  event_type text NOT NULL DEFAULT 'stock_update',
  external_event_id text,
  external_reference text,
  odoo_sku text,
  odoo_location_code text,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  size_variant_id uuid REFERENCES public.product_size_variants(id) ON DELETE SET NULL,
  sync_status text NOT NULL DEFAULT 'received' CHECK (
    sync_status = ANY (ARRAY['received','applied','ignored','failed'])
  ),
  change_mode text NOT NULL DEFAULT 'absolute' CHECK (
    change_mode = ANY (ARRAY['absolute','delta'])
  ),
  stock_before integer,
  stock_after integer,
  delta integer,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_inventory_sync_events_source_external
  ON public.inventory_sync_events(source, external_event_id, odoo_sku)
  WHERE external_event_id IS NOT NULL;

CREATE INDEX idx_inventory_sync_events_created_at ON public.inventory_sync_events(created_at DESC);
CREATE INDEX idx_inventory_sync_events_status ON public.inventory_sync_events(sync_status, created_at DESC);
CREATE INDEX idx_inventory_sync_events_product_id ON public.inventory_sync_events(product_id);

GRANT SELECT ON public.inventory_sync_events TO authenticated;
GRANT ALL ON public.inventory_sync_events TO service_role;

ALTER TABLE public.inventory_sync_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read inventory_sync_events"
  ON public.inventory_sync_events FOR SELECT
  TO authenticated
  USING (is_admin_or_editor());

CREATE POLICY "service manage inventory_sync_events"
  ON public.inventory_sync_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
