-- Add stock and images columns to products (non-destructive, additive only)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT '{}'::text[];

-- Tighten the existing product-images storage bucket: keep it public,
-- restrict allowed MIME types and cap file size at 5MB.
UPDATE storage.buckets
   SET public = true,
       file_size_limit = 5242880,
       allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp']
 WHERE id = 'product-images';