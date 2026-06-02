-- Preventive indexes for anticipated query patterns once data volume grows

-- Store locator: filtering by region + active status
CREATE INDEX IF NOT EXISTS idx_stores_region_active ON public.stores (region, is_active);

-- Admin audit views: recent activity logs
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log (created_at DESC);

-- Admin audit views: per-user recent activity
CREATE INDEX IF NOT EXISTS idx_activity_log_admin_created_at ON public.activity_log (admin_user_id, created_at DESC);

-- Inquiry list ordering + SLA window scans
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON public.inquiries (created_at DESC);