-- gdpr_requests: compliance log for data subject rights
CREATE TABLE public.gdpr_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type text NOT NULL CHECK (request_type IN ('export','delete','auto_retention')),
  customer_email text NOT NULL,
  performed_by uuid REFERENCES public.admin_users(id),
  affected_inquiry_ids uuid[] NOT NULL DEFAULT '{}',
  affected_count integer NOT NULL DEFAULT 0,
  notes text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.gdpr_requests TO authenticated;
GRANT ALL ON public.gdpr_requests TO service_role;

ALTER TABLE public.gdpr_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read gdpr_requests" ON public.gdpr_requests
  FOR SELECT TO authenticated USING (is_admin());

CREATE POLICY "admins insert gdpr_requests" ON public.gdpr_requests
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE INDEX gdpr_requests_email_idx ON public.gdpr_requests (customer_email);
CREATE INDEX gdpr_requests_created_idx ON public.gdpr_requests (created_at DESC);

-- activity_log archive for >2yr entries
CREATE TABLE public.activity_log_archive (
  LIKE public.activity_log INCLUDING ALL
);
GRANT SELECT ON public.activity_log_archive TO authenticated;
GRANT ALL ON public.activity_log_archive TO service_role;
ALTER TABLE public.activity_log_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read activity_log_archive" ON public.activity_log_archive
  FOR SELECT TO authenticated USING (is_admin());

-- Anonymize all inquiries for a given email (used by admin delete + retention)
CREATE OR REPLACE FUNCTION public.anonymize_customer_email(_email text)
RETURNS TABLE(inquiry_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_anon_email text := 'deleted-' || gen_random_uuid()::text || '@anonymous.local';
BEGIN
  RETURN QUERY
  UPDATE public.inquiries
     SET customer_name = '[deleted]',
         customer_email = v_anon_email,
         customer_phone = NULL,
         customer_city = NULL,
         message = NULL,
         notes = NULL,
         closing_notes = NULL,
         updated_at = now()
   WHERE customer_email ILIKE _email
   RETURNING id;
END;
$$;

-- Retention worker: anonymize inquiries >3 years and archive activity_log >2 years
CREATE OR REPLACE FUNCTION public.run_data_retention()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_anonymized int := 0;
  v_archived int := 0;
  v_emails text[];
  v_email text;
  v_ids uuid[];
BEGIN
  -- Collect distinct emails older than 3 years that aren't already anonymized
  SELECT array_agg(DISTINCT customer_email)
    INTO v_emails
    FROM public.inquiries
   WHERE created_at < now() - interval '3 years'
     AND customer_email NOT LIKE 'deleted-%@anonymous.local';

  IF v_emails IS NOT NULL THEN
    FOREACH v_email IN ARRAY v_emails LOOP
      SELECT array_agg(inquiry_id) INTO v_ids
        FROM public.anonymize_customer_email(v_email);
      IF v_ids IS NOT NULL THEN
        v_anonymized := v_anonymized + array_length(v_ids, 1);
        INSERT INTO public.gdpr_requests (request_type, customer_email, affected_inquiry_ids, affected_count, notes)
        VALUES ('auto_retention', v_email, v_ids, array_length(v_ids, 1), 'Auto-anonymized: >3 years old');
      END IF;
    END LOOP;
  END IF;

  -- Archive activity_log older than 2 years
  WITH moved AS (
    DELETE FROM public.activity_log
     WHERE created_at < now() - interval '2 years'
     RETURNING *
  )
  INSERT INTO public.activity_log_archive
  SELECT * FROM moved;
  GET DIAGNOSTICS v_archived = ROW_COUNT;

  RETURN jsonb_build_object('anonymized_inquiries', v_anonymized, 'archived_activity_log', v_archived, 'ran_at', now());
END;
$$;

-- Schedule daily retention at 03:15
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule(
  'gdpr-data-retention-daily',
  '15 3 * * *',
  $$ SELECT public.run_data_retention(); $$
);