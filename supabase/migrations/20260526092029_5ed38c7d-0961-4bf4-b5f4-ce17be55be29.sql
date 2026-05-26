
ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS notification_email_scope text NOT NULL DEFAULT 'all'
    CHECK (notification_email_scope IN ('all', 'assigned', 'none')),
  ADD COLUMN IF NOT EXISTS browser_notifications_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS quiet_hours_start smallint
    CHECK (quiet_hours_start IS NULL OR (quiet_hours_start BETWEEN 0 AND 23)),
  ADD COLUMN IF NOT EXISTS quiet_hours_end smallint
    CHECK (quiet_hours_end IS NULL OR (quiet_hours_end BETWEEN 0 AND 23)),
  ADD COLUMN IF NOT EXISTS whatsapp_notifications_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_phone text;

-- Allow each admin to update their OWN row (preferences only).
-- Existing "admins manage admin_users" policy already covers full admin access.
CREATE POLICY "editors update own admin row"
  ON public.admin_users
  FOR UPDATE
  TO authenticated
  USING (email = (SELECT (auth.jwt() ->> 'email')))
  WITH CHECK (email = (SELECT (auth.jwt() ->> 'email')));
