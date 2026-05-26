
ALTER TABLE public.inquiries
  ADD COLUMN IF NOT EXISTS first_contacted_at timestamptz;

-- Backfill: assume any inquiry whose status isn't "new" was contacted at updated_at.
UPDATE public.inquiries
SET first_contacted_at = updated_at
WHERE first_contacted_at IS NULL
  AND status <> 'new';

CREATE INDEX IF NOT EXISTS inquiries_first_contacted_at_idx
  ON public.inquiries (first_contacted_at);

CREATE OR REPLACE FUNCTION public.handle_inquiry_sla()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
  v_action   text;
  v_elapsed  interval;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND OLD.status = 'new'
     AND NEW.first_contacted_at IS NULL
  THEN
    NEW.first_contacted_at := now();

    SELECT id INTO v_admin_id
      FROM public.admin_users
      WHERE email = (SELECT (auth.jwt() ->> 'email'))
      LIMIT 1;

    v_elapsed := now() - NEW.created_at;
    v_action := CASE
      WHEN v_elapsed > interval '24 hours' THEN 'sla_breach_first_contact'
      ELSE 'sla_first_contact'
    END;

    INSERT INTO public.activity_log (admin_user_id, action, entity_type, entity_id)
    VALUES (v_admin_id, v_action, 'inquiry', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inquiry_sla ON public.inquiries;
CREATE TRIGGER trg_inquiry_sla
  BEFORE UPDATE OF status ON public.inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_inquiry_sla();
