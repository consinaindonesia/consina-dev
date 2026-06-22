create table if not exists public.product_slug_redirects (
  old_slug text primary key,
  target_product_id uuid not null references public.products(id) on delete cascade,
  target_slug text null
);

create index if not exists idx_product_slug_redirects_target_product
  on public.product_slug_redirects(target_product_id);

grant select on public.product_slug_redirects to anon;
grant select, insert, update, delete on public.product_slug_redirects to authenticated;
grant all on public.product_slug_redirects to service_role;

alter table public.product_slug_redirects enable row level security;

drop policy if exists "public read product slug redirects" on public.product_slug_redirects;
create policy "public read product slug redirects"
on public.product_slug_redirects
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products p
    where p.id = product_slug_redirects.target_product_id
      and p.is_active = true
  )
);

drop policy if exists "staff manage product slug redirects" on public.product_slug_redirects;
create policy "staff manage product slug redirects"
on public.product_slug_redirects
for all
to authenticated
using (public.is_admin_or_editor())
with check (public.is_admin_or_editor());
