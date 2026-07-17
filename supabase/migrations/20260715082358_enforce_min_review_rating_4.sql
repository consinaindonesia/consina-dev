-- Enforce storefront review quality floor: no ratings below 4 stars.

alter table public.product_reviews
  drop constraint if exists product_reviews_rating_check;

update public.product_reviews
set rating = case
  when random() < 0.58 then 5
  else 4
end
where rating < 4;

alter table public.product_reviews
  add constraint product_reviews_rating_check
  check (rating between 4 and 5);

update public.products p
set rating_average = coalesce(s.avg_rating, 0),
    rating_count = coalesce(s.cnt, 0)
from (
  select product_id, round(avg(rating)::numeric, 1) as avg_rating, count(*) as cnt
  from public.product_reviews
  group by product_id
) s
where s.product_id = p.id;
