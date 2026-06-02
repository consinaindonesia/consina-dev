-- 1. New columns
ALTER TABLE public.activity_log
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS before jsonb,
  ADD COLUMN IF NOT EXISTS "after" jsonb,
  ADD COLUMN IF NOT EXISTS metadata jsonb;

-- 2. Expand check constraints
ALTER TABLE public.activity_log DROP CONSTRAINT IF EXISTS activity_log_action_check;
ALTER TABLE public.activity_log ADD CONSTRAINT activity_log_action_check
  CHECK (action = ANY (ARRAY[
    'created','updated','deleted',
    'login_success','login_failed',
    'password_reset_requested','password_changed',
    'role_changed','status_changed',
    'bulk_import','bulk_delete','bulk_translate',
    'settings_changed','user_deactivated',
    'sla_first_contact','sla_breach_first_contact'
  ]));

ALTER TABLE public.activity_log DROP CONSTRAINT IF EXISTS activity_log_entity_type_check;
ALTER TABLE public.activity_log ADD CONSTRAINT activity_log_entity_type_check
  CHECK (entity_type = ANY (ARRAY[
    'product','category','inquiry','store','admin_user',
    'attribute','category_attribute',
    'auth','setting','bulk','order','shipping_method','shipping_zone'
  ]));

CREATE INDEX IF NOT EXISTS idx_activity_log_action ON public.activity_log (action);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity_type ON public.activity_log (entity_type);

-- 3. Updated change-logger with before/after snapshot for sensitive fields
CREATE OR REPLACE FUNCTION public.log_entity_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_admin_id uuid;
  v_action text;
  v_entity_id uuid;
  v_entity_type text := TG_ARGV[0];
  v_before jsonb := NULL;
  v_after  jsonb := NULL;
BEGIN
  SELECT id INTO v_admin_id FROM public.admin_users
    WHERE email = (SELECT (auth.jwt() ->> 'email')) LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    v_action := 'created'; v_entity_id := NEW.id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'updated'; v_entity_id := NEW.id;
  ELSE
    v_action := 'deleted'; v_entity_id := OLD.id;
  END IF;

  -- Capture before/after for sensitive fields only
  IF v_entity_type = 'product' THEN
    IF TG_OP = 'UPDATE' THEN
      IF NEW.price_idr IS DISTINCT FROM OLD.price_idr
         OR NEW.is_active IS DISTINCT FROM OLD.is_active
         OR NEW.sku IS DISTINCT FROM OLD.sku THEN
        v_before := jsonb_build_object('price_idr', OLD.price_idr, 'is_active', OLD.is_active, 'sku', OLD.sku);
        v_after  := jsonb_build_object('price_idr', NEW.price_idr, 'is_active', NEW.is_active, 'sku', NEW.sku);
      END IF;
    END IF;
  ELSIF v_entity_type = 'admin_user' THEN
    IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
      v_action := 'role_changed';
      v_before := jsonb_build_object('role', OLD.role, 'email', OLD.email);
      v_after  := jsonb_build_object('role', NEW.role, 'email', NEW.email);
    END IF;
  ELSIF v_entity_type = 'category' OR v_entity_type = 'store' THEN
    IF TG_OP = 'UPDATE' THEN
      v_before := to_jsonb(OLD) - 'updated_at' - 'created_at';
      v_after  := to_jsonb(NEW) - 'updated_at' - 'created_at';
    END IF;
  ELSIF v_entity_type = 'inquiry' THEN
    IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
      v_action := 'status_changed';
      v_before := jsonb_build_object('status', OLD.status);
      v_after  := jsonb_build_object('status', NEW.status);
    END IF;
  END IF;

  INSERT INTO public.activity_log (admin_user_id, action, entity_type, entity_id, before, "after")
  VALUES (v_admin_id, v_action, v_entity_type, v_entity_id, v_before, v_after);

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 4. Inquiry trigger (was missing — only SLA handler existed)
DROP TRIGGER IF EXISTS trg_inquiries_activity ON public.inquiries;
CREATE TRIGGER trg_inquiries_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_change('inquiry');

-- 5. Order trigger
DROP TRIGGER IF EXISTS trg_orders_activity ON public.orders;
CREATE TRIGGER trg_orders_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_change('order');