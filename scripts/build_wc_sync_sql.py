#!/usr/bin/env python3

import csv
import html
import json
import re
import sys
from pathlib import Path
from typing import Optional


MARKETING_PATHS = {"PROMO", "NEW PRODUCTS", "SALE", "STOCK SALE"}

COLOR_TOKEN_MAP = {
    "BLACK": "Black",
    "WHITE": "White",
    "GREY": "Grey",
    "GRAY": "Grey",
    "RED": "Red",
    "BLUE": "Blue",
    "GREEN": "Green",
    "PINK": "Pink",
    "ORANGE": "Orange",
    "YELLOW": "Yellow",
    "PURPLE": "Purple",
    "BROWN": "Brown",
    "NAVY": "Navy",
    "HITAM": "Black",
    "ABU": "Grey",
    "MERAH": "Red",
    "BIRU": "Blue",
    "HIJAU": "Green",
    "COKLAT": "Brown",
    "KUNING": "Yellow",
    "OLIVE": "Olive",
    "KHAKI": "Khaki",
    "MAROON": "Maroon",
    "CREAM": "Cream",
    "BEIGE": "Beige",
    "SILVER": "Silver",
    "GOLD": "Gold",
    "DARK": "Dark",
    "LIGHT": "Light",
    "FOREST": "Forest",
}

HEX_BY_COLOR = {
    "Black": "#111111",
    "White": "#f5f5f5",
    "Grey": "#6b7280",
    "Red": "#dc2626",
    "Blue": "#2563eb",
    "Green": "#15803d",
    "Pink": "#ec4899",
    "Orange": "#f97316",
    "Yellow": "#eab308",
    "Purple": "#7c3aed",
    "Brown": "#8b5e3c",
    "Navy": "#1e3a8a",
    "Olive": "#708238",
    "Khaki": "#8a7f58",
    "Maroon": "#7f1d1d",
    "Cream": "#f3e5c8",
    "Beige": "#d6c7a1",
    "Silver": "#9ca3af",
    "Gold": "#c89f2d",
    "Forest": "#166534",
}

ROOT_MAP = {
    "Fashion": ["Apparel"],
    "Activity": ["Activities"],
    "Accessories": ["Accessories"],
    "Footwear": ["Footwear"],
    "Bags": ["Bags"],
    "Camping": ["Activities", "Camping"],
    "Travelling": ["Activities", "Travelling"],
    "Climbing": ["Activities", "Climbing"],
}

SEGMENT_MAP = {
    "Long Pants": "Celana Panjang",
}

NAME_MAP = {
    "Bags": ("Tas", "Bags"),
    "Activities": ("Aktivitas", "Activities"),
    "Apparel": ("Pakaian", "Apparel"),
    "Accessories": ("Aksesori", "Accessories"),
    "Footwear": ("Alas Kaki", "Footwear"),
    "Camping": ("Kemping", "Camping"),
    "Travelling": ("Traveling", "Travelling"),
    "Urban": ("Urban", "Urban"),
    "Running": ("Lari", "Running"),
    "Climbing": ("Panjat Tebing", "Climbing"),
}

EXISTING_SLUGS = {
    ("Activities",): "activities",
    ("Activities", "Camping"): "camping",
    ("Activities", "Travelling"): "travelling",
    ("Activities", "Urban"): "urban",
    ("Activities", "Running"): "running",
    ("Activities", "Hiking"): "hiking",
    ("Apparel",): "apparel",
    ("Accessories",): "accessories",
    ("Footwear",): "footwear",
    ("Tents",): "tents",
}


def slugify(text: str) -> str:
    text = text.strip().lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-+", "-", text).strip("-")
    return text or "category"


def clean_text(value: str) -> str:
    if not value:
        return ""
    value = html.unescape(value)
    value = value.replace("\xa0", " ")
    value = re.sub(r"<br\s*/?>", "\n", value, flags=re.I)
    value = re.sub(r"</div\s*>", "\n", value, flags=re.I)
    value = re.sub(r"<[^>]+>", " ", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def parse_int(value: str) -> int:
    digits = re.sub(r"[^0-9]", "", value or "")
    return int(digits) if digits else 0


def parse_images(value: str) -> list[str]:
    return [part.strip() for part in (value or "").split(",") if part.strip()]


def normalize_token(token: str) -> str:
    token = re.sub(r"[^A-Za-z]+", " ", token or "").strip().upper()
    return token


def normalize_color_name(color: str) -> str:
    color = re.sub(r"\s+", " ", (color or "").strip())
    if not color:
        return "Default"
    parts = [COLOR_TOKEN_MAP.get(normalize_token(part), part.title()) for part in re.split(r"([-/])", color) if part]
    joined = "".join(parts)
    joined = re.sub(r"\s+", " ", joined).strip()
    return joined or "Default"


def color_hex(color: str) -> str:
    tokens = [COLOR_TOKEN_MAP.get(normalize_token(part), "") for part in re.split(r"[\s/-]+", color or "") if part]
    for token in tokens:
        if token in {"Dark", "Light"}:
            continue
        if token in HEX_BY_COLOR:
            return HEX_BY_COLOR[token]
    return "#6b7280"


def looks_like_color(candidate: str) -> bool:
    tokens = [COLOR_TOKEN_MAP.get(normalize_token(part), "") for part in re.split(r"[\s/-]+", candidate or "") if part]
    tokens = [token for token in tokens if token]
    if not tokens:
        return False
    return all(token in COLOR_TOKEN_MAP.values() or token in {"Dark", "Light"} for token in tokens)


def extract_base_and_color(name: str, sku: str) -> tuple[str, str]:
    cleaned = re.sub(r"\s+", " ", (name or "").replace("\xa0", " ")).strip(" ,-_")
    if not cleaned:
        return sku.strip(), "Default"

    if "," in cleaned:
        left, right = cleaned.rsplit(",", 1)
        if looks_like_color(right):
            return left.strip(" ,-_"), normalize_color_name(right)

    for separator in (" - ", "-"):
        if separator in cleaned:
            left, right = cleaned.rsplit(separator, 1)
            if looks_like_color(right):
                return left.strip(" ,-_"), normalize_color_name(right)

    words = cleaned.split()
    for size in range(min(4, len(words)), 0, -1):
        tail = " ".join(words[-size:])
        if looks_like_color(tail):
            return " ".join(words[:-size]).strip(" ,-_"), normalize_color_name(tail)

    if "-" in sku:
        _, sku_tail = sku.rsplit("-", 1)
        if looks_like_color(sku_tail):
            return cleaned, normalize_color_name(sku_tail)

    return cleaned, "Default"


def normalize_category_path(raw_path: str) -> Optional[list[str]]:
    parts = [
        SEGMENT_MAP.get(p.strip(), p.strip())
        for p in raw_path.split(">")
        if p.strip() and p.strip().lower() != "all"
    ]
    if not parts:
        return None
    if " > ".join(parts).upper() in MARKETING_PATHS:
        return None
    root = parts[0]
    mapped_root = ROOT_MAP.get(root)
    if not mapped_root:
        return None
    return mapped_root + parts[1:]


def choose_primary_path(raw_categories: str) -> Optional[list[str]]:
    candidates: list[list[str]] = []
    for raw in [part.strip() for part in (raw_categories or "").split(",") if part.strip()]:
        normalized = normalize_category_path(raw)
        if normalized:
            candidates.append(normalized)
    if not candidates:
        return None
    candidates.sort(key=lambda path: (-len(path), path))
    return candidates[0]


def category_slug(path: tuple[str, ...]) -> str:
    existing = EXISTING_SLUGS.get(path)
    if existing:
        return existing
    return slugify("-".join(path))


def category_names(segment: str) -> tuple[str, str]:
    return NAME_MAP.get(segment, (segment, segment))


def sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def build_category_sql(paths: set[tuple[str, ...]]) -> str:
    lines = ["begin;"]
    inserted: set[tuple[str, ...]] = set()
    for path in sorted(paths, key=lambda p: (len(p), p)):
        if path in EXISTING_SLUGS:
            continue
        parent = path[:-1]
        parent_slug = category_slug(parent)
        slug = category_slug(path)
        name_id, name_en = category_names(path[-1])
        lines.append(
            "insert into public.categories (slug, name_id, name_en, parent_category_id, is_active)\n"
            f"select {sql_literal(slug)}, {sql_literal(name_id)}, {sql_literal(name_en)}, p.id, true\n"
            f"from public.categories p\n"
            f"where p.slug = {sql_literal(parent_slug)}\n"
            f"  and not exists (select 1 from public.categories c where c.slug = {sql_literal(slug)});"
        )
        inserted.add(path)
    lines.append("commit;")
    return "\n".join(lines)


def build_product_batch_sql(batch: list[dict[str, object]]) -> str:
    payload = json.dumps(batch, ensure_ascii=False)
    return f"""
with src as (
  select *
  from jsonb_to_recordset({sql_literal(payload)}::jsonb) as x(
    sku text,
    regular_price integer,
    sale_price integer,
    discount_percent numeric,
    is_featured boolean,
    slug text,
    images text[],
    category_slug text
  )
),
updated as (
  update public.products p
  set
    price_idr = case
      when coalesce(p.price_idr, 0) = 0 and coalesce(src.regular_price, 0) > 0 then src.regular_price
      else p.price_idr
    end,
    original_price_idr = case
      when coalesce(p.original_price_idr, 0) = 0 and coalesce(src.regular_price, 0) > 0 then src.regular_price
      else p.original_price_idr
    end,
    sale_price_idr = case
      when coalesce(p.sale_price_idr, 0) = 0 and coalesce(src.sale_price, 0) > 0 then src.sale_price
      else p.sale_price_idr
    end,
    discount_percent = case
      when coalesce(p.discount_percent, 0) = 0 and coalesce(src.discount_percent, 0) > 0 then src.discount_percent
      else p.discount_percent
    end,
    is_on_sale = case
      when coalesce(p.is_on_sale, false) = false and coalesce(src.sale_price, 0) > 0 then true
      else p.is_on_sale
    end,
    images = case
      when coalesce(array_length(p.images, 1), 0) = 0 and coalesce(array_length(src.images, 1), 0) > 0 then src.images
      else p.images
    end,
    slug = case
      when coalesce(p.slug, '') = '' and coalesce(src.slug, '') <> '' then src.slug
      else p.slug
    end,
    is_featured = case
      when src.is_featured then true
      else p.is_featured
    end,
    category_id = coalesce(cat.id, p.category_id)
  from src
  left join public.categories cat on cat.slug = src.category_slug
  where p.sku = src.sku
    and (
      (coalesce(p.price_idr, 0) = 0 and coalesce(src.regular_price, 0) > 0)
      or (coalesce(p.original_price_idr, 0) = 0 and coalesce(src.regular_price, 0) > 0)
      or (coalesce(p.sale_price_idr, 0) = 0 and coalesce(src.sale_price, 0) > 0)
      or (coalesce(p.discount_percent, 0) = 0 and coalesce(src.discount_percent, 0) > 0)
      or (coalesce(array_length(p.images, 1), 0) = 0 and coalesce(array_length(src.images, 1), 0) > 0)
      or (coalesce(p.slug, '') = '' and coalesce(src.slug, '') <> '')
      or (src.is_featured and coalesce(p.is_featured, false) = false)
      or (cat.id is not null and p.category_id is distinct from cat.id)
    )
  returning p.id, p.sku, coalesce(cat.id, p.category_id) as category_id
),
category_links as (
  insert into public.product_categories (product_id, category_id, is_primary)
  select id, category_id, true
  from updated
  where category_id is not null
  on conflict (product_id, category_id)
  do update set is_primary = excluded.is_primary
  returning product_id
)
select
  (select count(*) from updated) as updated_products,
  (select count(*) from category_links) as touched_category_links;
""".strip()


def build_product_images_sql() -> str:
    return """
insert into public.product_images (
  product_id,
  image_url,
  alt_text_id,
  alt_text_en,
  sort_order,
  is_primary,
  thumbnail_url,
  large_url
)
select
  p.id,
  img.url,
  null,
  null,
  img.ord - 1,
  img.ord = 1,
  img.url,
  img.url
from public.products p
cross join lateral unnest(p.images) with ordinality as img(url, ord)
where p.is_active = true
  and coalesce(array_length(p.images, 1), 0) > 0
  and not exists (
    select 1
    from public.product_images pi
    where pi.product_id = p.id
  );
""".strip()


def build_merge_variants_sql(batch: list[dict[str, object]]) -> str:
    payload = json.dumps(batch, ensure_ascii=False)
    return f"""
with src as (
  select *
  from jsonb_to_recordset({sql_literal(payload)}::jsonb) as x(
    sku text,
    base_name text,
    color_name text,
    color_hex text,
    regular_price integer,
    sale_price integer,
    primary_image text,
    stock integer
  )
),
matched as (
  select
    p.id,
    p.sku,
    p.slug,
    p.name_id,
    p.name_en,
    p.price_idr,
    p.original_price_idr,
    p.sale_price_idr,
    p.is_on_sale,
    p.discount_percent,
    p.stock,
    p.stock_status,
    p.is_active,
    p.is_featured,
    p.category_id,
    p.images,
    p.created_at,
    src.base_name,
    src.color_name,
    src.color_hex,
    src.regular_price,
    src.sale_price,
    src.primary_image,
    src.stock as csv_stock,
    coalesce(nullif(p.price_idr, 0), nullif(src.regular_price, 0), 0) as effective_price
  from public.products p
  join src on src.sku = p.sku
),
group_stats as (
  select
    base_name,
    count(*) as group_size,
    count(distinct category_id) as category_count,
    count(distinct effective_price) filter (where effective_price > 0) as positive_price_count,
    count(distinct color_name) filter (where color_name <> 'Default') as color_count
  from matched
  group by base_name
),
merge_candidates as (
  select m.*
  from matched m
  join group_stats g on g.base_name = m.base_name
  where g.group_size > 1
    and g.category_count <= 1
    and g.positive_price_count <= 1
    and g.color_count >= 1
),
ranked as (
  select
    mc.*,
    row_number() over (
      partition by mc.base_name
      order by
        mc.is_active desc,
        mc.is_featured desc,
        (mc.effective_price > 0) desc,
        (coalesce(array_length(mc.images, 1), 0) > 0) desc,
        coalesce(mc.stock, 0) desc,
        mc.created_at asc,
        mc.id asc
    ) as rn
  from merge_candidates mc
),
canonical as (
  select *
  from ranked
  where rn = 1
),
members as (
  select
    r.*,
    c.id as canonical_id,
    c.sku as canonical_sku
  from ranked r
  join canonical c on c.base_name = r.base_name
),
deduped_members as (
  select *
  from (
    select
      m.*,
      row_number() over (
        partition by m.canonical_id, m.color_name
        order by
          (m.primary_image is not null and m.primary_image <> '') desc,
          coalesce(m.stock, 0) desc,
          m.created_at asc,
          m.id asc
      ) as color_rank
    from members m
  ) t
  where t.color_rank = 1
),
deleted_variants as (
  delete from public.product_variants pv
  where pv.product_id in (select distinct canonical_id from members)
  returning pv.product_id
),
inserted_variants as (
  insert into public.product_variants (
    product_id,
    color_name,
    color_hex,
    image_url,
    stock,
    sort_order
  )
  select
    dm.canonical_id,
    dm.color_name,
    dm.color_hex,
    coalesce(nullif(dm.primary_image, ''), dm.images[1]),
    coalesce(dm.stock, dm.csv_stock, 0),
    row_number() over (partition by dm.canonical_id order by dm.created_at asc, dm.id asc) - 1
  from deduped_members dm
  order by dm.canonical_id, dm.created_at asc, dm.id asc
  returning product_id
),
canonical_rollup as (
  select
    dm.canonical_id,
    dm.base_name,
    array_remove(array_agg(distinct coalesce(nullif(dm.primary_image, ''), dm.images[1])), null) as merged_images,
    sum(greatest(coalesce(dm.stock, dm.csv_stock, 0), 0)) as total_stock,
    max(nullif(dm.regular_price, 0)) as merged_regular_price,
    max(nullif(dm.sale_price, 0)) as merged_sale_price
  from deduped_members dm
  group by dm.canonical_id, dm.base_name
),
updated_canonical as (
  update public.products p
  set
    name_id = cr.base_name,
    name_en = cr.base_name,
    images = case
      when coalesce(array_length(cr.merged_images, 1), 0) > 0 then cr.merged_images
      else p.images
    end,
    stock = coalesce(cr.total_stock, p.stock, 0),
    stock_status = case
      when coalesce(cr.total_stock, p.stock, 0) <= 0 then 'out_of_stock'
      when coalesce(cr.total_stock, p.stock, 0) <= 5 then 'low_stock'
      else 'in_stock'
    end,
    price_idr = case
      when coalesce(p.price_idr, 0) = 0 and coalesce(cr.merged_regular_price, 0) > 0 then cr.merged_regular_price
      else p.price_idr
    end,
    original_price_idr = case
      when coalesce(p.original_price_idr, 0) = 0 and coalesce(cr.merged_regular_price, 0) > 0 then cr.merged_regular_price
      else p.original_price_idr
    end,
    sale_price_idr = case
      when coalesce(p.sale_price_idr, 0) = 0 and coalesce(cr.merged_sale_price, 0) > 0 then cr.merged_sale_price
      else p.sale_price_idr
    end,
    is_on_sale = case
      when coalesce(cr.merged_sale_price, 0) > 0 then true
      else p.is_on_sale
    end,
    discount_percent = case
      when coalesce(p.discount_percent, 0) = 0
        and coalesce(cr.merged_regular_price, 0) > 0
        and coalesce(cr.merged_sale_price, 0) > 0
        and cr.merged_sale_price < cr.merged_regular_price
      then round(((cr.merged_regular_price - cr.merged_sale_price) * 100.0 / cr.merged_regular_price)::numeric, 2)
      else p.discount_percent
    end
  from canonical_rollup cr
  where p.id = cr.canonical_id
  returning p.id
),
upsert_redirects as (
  insert into public.product_slug_redirects (
    old_slug,
    target_product_id,
    target_slug
  )
  select
    redirect_key,
    dm.canonical_id,
    cp.slug
  from (
    select canonical_id, slug as redirect_key
    from deduped_members
    where id <> canonical_id and slug is not null and slug <> ''
    union
    select canonical_id, sku as redirect_key
    from deduped_members
    where id <> canonical_id and sku <> ''
  ) dm
  join public.products cp on cp.id = dm.canonical_id
  on conflict (old_slug) do update
  set
    target_product_id = excluded.target_product_id,
    target_slug = excluded.target_slug
  returning old_slug
),
deactivated as (
  update public.products p
  set is_active = false
  from members m
  where p.id = m.id
    and m.id <> m.canonical_id
    and p.is_active = true
  returning p.id
)
select
  (select count(*) from canonical) as canonical_products,
  (select count(*) from inserted_variants) as inserted_variants,
  (select count(*) from updated_canonical) as updated_canonical,
  (select count(*) from upsert_redirects) as redirect_rows,
  (select count(*) from deactivated) as deactivated_products;
""".strip()


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Usage: build_wc_sync_sql.py <csv_path> <output_dir>")

    csv_path = Path(sys.argv[1])
    out_dir = Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)

    selected_rows: list[dict[str, object]] = []
    variant_rows: list[dict[str, object]] = []
    category_paths: set[tuple[str, ...]] = set()

    with csv_path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            sku = (row.get("SKU") or "").strip()
            raw_categories = (row.get("Kategori") or "").strip()
            if not sku or not raw_categories:
                continue

            primary_path = choose_primary_path(raw_categories)
            if not primary_path:
                continue

            category_paths.add(tuple(primary_path))

            regular_price = parse_int(row.get("Harga normal") or "")
            sale_price = parse_int(row.get("Harga obral") or "")
            discount_percent = 0
            if regular_price > 0 and sale_price > 0 and sale_price < regular_price:
                discount_percent = round((regular_price - sale_price) * 100 / regular_price, 2)

            is_featured = (row.get("Apakah diunggulkan?") or "").strip() == "1"
            slug = (row.get("Meta:_wp_desired_post_slug") or row.get("slug") or "").strip()
            images = parse_images(row.get("Gambar-gambar") or "")
            stock = parse_int(row.get("Stok") or "")
            base_name, parsed_color_name = extract_base_and_color((row.get("Nama") or "").strip(), sku)
            primary_image = images[0] if images else ""

            variant_rows.append(
                {
                    "sku": sku,
                    "base_name": base_name,
                    "color_name": parsed_color_name,
                    "color_hex": color_hex(parsed_color_name),
                    "regular_price": regular_price,
                    "sale_price": sale_price,
                    "primary_image": primary_image,
                    "stock": stock,
                }
            )
            should_update = (
                regular_price > 0
                or sale_price > 0
                or bool(images)
                or is_featured
                or bool(slug)
            )
            if should_update:
                selected_rows.append(
                    {
                        "sku": sku,
                        "regular_price": regular_price,
                        "sale_price": sale_price,
                        "discount_percent": discount_percent,
                        "is_featured": is_featured,
                        "slug": slug,
                        "images": images,
                        "category_slug": category_slug(tuple(primary_path)),
                    }
                )

    (out_dir / "01_categories.sql").write_text(build_category_sql(category_paths), encoding="utf-8")

    batch_size = 60
    for index in range(0, len(selected_rows), batch_size):
        batch = selected_rows[index:index + batch_size]
        filename = f"{index // batch_size + 2:02d}_products_{index // batch_size + 1:02d}.sql"
        (out_dir / filename).write_text(build_product_batch_sql(batch), encoding="utf-8")

    (out_dir / "10_seed_product_images.sql").write_text(build_product_images_sql(), encoding="utf-8")

    variant_rows.sort(key=lambda row: (str(row["base_name"]), str(row["sku"])))
    (out_dir / "11_merge_variants.sql").write_text(build_merge_variants_sql(variant_rows), encoding="utf-8")

    print(f"selected_rows={len(selected_rows)}")
    print(f"variant_rows={len(variant_rows)}")
    print(f"category_paths={len(category_paths)}")
    print(f"sql_files={3 + (len(selected_rows) + batch_size - 1) // batch_size}")


if __name__ == "__main__":
    main()
