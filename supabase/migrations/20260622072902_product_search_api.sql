create extension if not exists vector with schema extensions;

alter table public.products
  add column if not exists advisor_embedding extensions.vector(1024);

create index if not exists products_advisor_embedding_hnsw_idx
  on public.products
  using hnsw (advisor_embedding extensions.vector_cosine_ops);

create or replace function public.match_products_for_advisor(
  query_embedding extensions.vector(1024),
  match_count int default 20,
  match_threshold float default 0
)
returns table (
  id uuid,
  sku text,
  slug text,
  name_en text,
  name_id text,
  category_slug text,
  category_name_en text,
  category_name_id text,
  short_description_en text,
  short_description_id text,
  description_en text,
  description_id text,
  price_idr integer,
  original_price_idr integer,
  sale_price_idr integer,
  stock integer,
  stock_status text,
  is_on_sale boolean,
  is_featured boolean,
  attributes jsonb,
  image_url text,
  similarity float
)
language sql
stable
as $$
  with ranked_images as (
    select
      pi.product_id,
      pi.image_url,
      row_number() over (
        partition by pi.product_id
        order by pi.is_primary desc, pi.sort_order asc, pi.id asc
      ) as rn
    from public.product_images pi
  )
  select
    p.id,
    p.sku,
    p.slug,
    p.name_en,
    p.name_id,
    c.slug as category_slug,
    c.name_en as category_name_en,
    c.name_id as category_name_id,
    p.short_description_en,
    p.short_description_id,
    p.description_en,
    p.description_id,
    p.price_idr,
    p.original_price_idr,
    p.sale_price_idr,
    p.stock,
    p.stock_status,
    p.is_on_sale,
    p.is_featured,
    p.attributes,
    coalesce(ri.image_url, p.images[1]) as image_url,
    1 - (p.advisor_embedding <=> query_embedding) as similarity
  from public.products p
  left join public.categories c on c.id = p.category_id
  left join ranked_images ri on ri.product_id = p.id and ri.rn = 1
  where
    p.is_active = true
    and p.advisor_embedding is not null
    and 1 - (p.advisor_embedding <=> query_embedding) >= match_threshold
  order by p.advisor_embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;
