-- Create the product-images bucket (public read)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read access to product images
create policy "public read product-images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'product-images');

-- Staff (admin or editor) can upload
create policy "staff upload product-images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'product-images' and public.is_admin_or_editor());

-- Staff can update
create policy "staff update product-images"
on storage.objects for update
to authenticated
using (bucket_id = 'product-images' and public.is_admin_or_editor())
with check (bucket_id = 'product-images' and public.is_admin_or_editor());

-- Staff can delete
create policy "staff delete product-images"
on storage.objects for delete
to authenticated
using (bucket_id = 'product-images' and public.is_admin_or_editor());

-- Add a thumbnail_url column to product_images so list views can use it
alter table public.product_images
  add column if not exists thumbnail_url text;