#!/usr/bin/env python3

import csv
import html
import json
import re
import sys
from collections import defaultdict
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
    "TOSCA": "Turquoise",
    "TURQUOISE": "Turquoise",
}

GENERIC_GROUP_TOKENS = {
    "JAKET",
    "CELANA",
    "CEL",
    "KAOS",
    "TSHIRT",
    "SHIRT",
    "KEMEJA",
    "SANDAL",
    "SENDAL",
    "SEPATU",
    "BAG",
    "TAS",
    "CONSINA",
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
    "Turquoise": "#0f766e",
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

PRIMARY_ROOT_PRIORITY = {
    "Footwear": 0,
    "Bags": 1,
    "Apparel": 2,
    "Accessories": 3,
    "Activities": 4,
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
    return text or "product"


def sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


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
    seen: set[str] = set()
    out: list[str] = []
    for part in (value or "").split(","):
        url = part.strip()
        if not url or url in seen:
            continue
        seen.add(url)
        out.append(url)
    return out


def normalize_token(token: str) -> str:
    return re.sub(r"[^A-Za-z]+", " ", token or "").strip().upper()


def normalize_color_name(color: str) -> str:
    color = re.sub(r"\s+", " ", (color or "").strip())
    if not color:
        return "Default"
    tokens: list[str] = []
    for part in re.split(r"[\s/-]+", color):
        if not part:
            continue
        mapped = COLOR_TOKEN_MAP.get(normalize_token(part), part.title())
        tokens.append(mapped)
    normalized = " ".join(tokens).strip()
    return normalized or "Default"


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
    mapped_root = ROOT_MAP.get(parts[0])
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
    candidates.sort(
        key=lambda path: (
            PRIMARY_ROOT_PRIORITY.get(path[0], 999),
            -len(path),
            path,
        )
    )
    return candidates[0]


def category_slug(path: tuple[str, ...]) -> str:
    existing = EXISTING_SLUGS.get(path)
    if existing:
        return existing
    return slugify("-".join(path))


def category_names(segment: str) -> tuple[str, str]:
    return NAME_MAP.get(segment, (segment, segment))


def normalize_name(text: str) -> str:
    text = clean_text(text)
    text = re.sub(r"\s+", " ", text).strip(" ,-_")
    return text


def normalize_family_name(value: str) -> str:
    value = normalize_name(value).upper()
    value = re.sub(r"\bCONSINA\b", " ", value)
    value = re.sub(r"\b(WS|WOMEN|WOMENS|WOMAN|MEN|MENS|KIDS|SERIES|ANAK|BOYS|GIRLS)\b", " ", value)
    value = re.sub(r"\b(JAKET|CELANA|CEL\.?|KAOS|T[\s-]?SHIRT|KEMEJA|SANDAL|SENDAL|SEPATU|BAG|TAS)\b", " ", value)
    color_words = sorted({key for key in COLOR_TOKEN_MAP} | {value.upper() for value in COLOR_TOKEN_MAP.values()}, key=len, reverse=True)
    if color_words:
        value = re.sub(r"\b(" + "|".join(re.escape(word) for word in color_words) + r")\b", " ", value)
    value = re.sub(r"\b(XXS|XS|S|M|L|XL|XXL|XXXL|[3-4][0-9])\b", " ", value)
    value = re.sub(r"[^A-Z0-9]+", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def is_generic_group_name(value: str) -> bool:
    words = [word for word in normalize_family_name(value).split() if word]
    if not words:
        return True
    return all(word in GENERIC_GROUP_TOKENS for word in words)


def is_generic_base_name(value: str) -> bool:
    words = [w for w in re.split(r"\s+", normalize_name(value)) if w]
    if not words:
        return True
    if len(words) == 1 and words[0].upper() in {"CONSINA"}:
        return True
    return False


def select_best_text(values: list[str]) -> str:
    cleaned = [normalize_name(v) for v in values if normalize_name(v)]
    if not cleaned:
        return ""
    cleaned.sort(key=lambda v: (len(v), v))
    return cleaned[-1]


def synthetic_sku(raw_id: str, name: str, desired_slug: str) -> str:
    base = slugify(desired_slug or name or raw_id).upper()
    if raw_id and base:
        return f"{base}-{raw_id}"
    if raw_id:
        return f"WC-{raw_id}"
    return base or "WC-PRODUCT"


def build_category_sql(paths: set[tuple[str, ...]]) -> str:
    lines = ["begin;"]
    for path in sorted(paths, key=lambda p: (len(p), p)):
        if path in EXISTING_SLUGS:
            continue
        slug = category_slug(path)
        name_id, name_en = category_names(path[-1])
        if len(path) == 1:
            lines.append(
                "insert into public.categories (slug, name_id, name_en, parent_category_id, is_active)\n"
                f"select {sql_literal(slug)}, {sql_literal(name_id)}, {sql_literal(name_en)}, null, true\n"
                f"where not exists (select 1 from public.categories c where c.slug = {sql_literal(slug)});"
            )
        else:
            parent_slug = category_slug(path[:-1])
            lines.append(
                "insert into public.categories (slug, name_id, name_en, parent_category_id, is_active)\n"
                f"select {sql_literal(slug)}, {sql_literal(name_id)}, {sql_literal(name_en)}, p.id, true\n"
                f"from public.categories p\n"
                f"where p.slug = {sql_literal(parent_slug)}\n"
                f"  and not exists (select 1 from public.categories c where c.slug = {sql_literal(slug)});"
            )
    lines.append("commit;")
    return "\n".join(lines)


def build_reset_sql() -> str:
    return "begin;\ndelete from public.products;\ncommit;"


def build_product_batch_sql(batch: list[dict[str, object]]) -> str:
    payload = json.dumps(batch, ensure_ascii=False)
    return f"""
with src as (
  select *
  from jsonb_to_recordset({sql_literal(payload)}::jsonb) as x(
    sku text,
    slug text,
    category_slug text,
    name_id text,
    name_en text,
    short_description_id text,
    short_description_en text,
    description_id text,
    description_en text,
    price_idr integer,
    original_price_idr integer,
    sale_price_idr integer,
    is_on_sale boolean,
    discount_percent numeric,
    is_featured boolean,
    stock integer,
    stock_status text,
    images text[],
    attributes jsonb
  )
),
inserted as (
  insert into public.products (
    sku,
    slug,
    category_id,
    name_id,
    name_en,
    short_description_id,
    short_description_en,
    description_id,
    description_en,
    price_idr,
    original_price_idr,
    sale_price_idr,
    is_on_sale,
    discount_percent,
    is_featured,
    stock,
    stock_status,
    images,
    attributes,
    is_active
  )
  select
    src.sku,
    src.slug,
    cat.id,
    src.name_id,
    src.name_en,
    nullif(src.short_description_id, ''),
    nullif(src.short_description_en, ''),
    nullif(src.description_id, ''),
    nullif(src.description_en, ''),
    src.price_idr,
    src.original_price_idr,
    src.sale_price_idr,
    src.is_on_sale,
    src.discount_percent,
    src.is_featured,
    src.stock,
    src.stock_status,
    src.images,
    coalesce(src.attributes, '{{}}'::jsonb),
    true
  from src
  left join public.categories cat on cat.slug = src.category_slug
  returning id, sku, category_id
),
links as (
  insert into public.product_categories (product_id, category_id, is_primary)
  select id, category_id, true
  from inserted
  where category_id is not null
  returning product_id
)
select
  (select count(*) from inserted) as inserted_products,
  (select count(*) from links) as inserted_primary_links;
""".strip()


def build_product_images_batch_sql(batch: list[dict[str, object]]) -> str:
    payload = json.dumps(batch, ensure_ascii=False)
    return f"""
with src as (
  select *
  from jsonb_to_recordset({sql_literal(payload)}::jsonb) as x(
    sku text,
    images text[]
  )
)
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
from src
join public.products p on p.sku = src.sku
cross join lateral unnest(src.images) with ordinality as img(url, ord)
where coalesce(array_length(src.images, 1), 0) > 0;
""".strip()


def build_variant_batch_sql(batch: list[dict[str, object]]) -> str:
    payload = json.dumps(batch, ensure_ascii=False)
    return f"""
with src as (
  select *
  from jsonb_to_recordset({sql_literal(payload)}::jsonb) as x(
    product_sku text,
    color_name text,
    color_hex text,
    image_url text,
    stock integer,
    sort_order integer,
    price_idr integer,
    original_price_idr integer,
    sale_price_idr integer
  )
)
insert into public.product_variants (
  product_id,
  color_name,
  color_hex,
  image_url,
  stock,
  sort_order,
  price_idr,
  original_price_idr,
  sale_price_idr
)
select
  p.id,
  src.color_name,
  src.color_hex,
  nullif(src.image_url, ''),
  src.stock,
  src.sort_order,
  src.price_idr,
  src.original_price_idr,
  src.sale_price_idr
from src
join public.products p on p.sku = src.product_sku;
""".strip()


def build_redirect_batch_sql(batch: list[dict[str, object]]) -> str:
    payload = json.dumps(batch, ensure_ascii=False)
    return f"""
with src as (
  select *
  from jsonb_to_recordset({sql_literal(payload)}::jsonb) as x(
    old_slug text,
    target_sku text,
    target_slug text
  )
)
insert into public.product_slug_redirects (
  old_slug,
  target_product_id,
  target_slug
)
select
  src.old_slug,
  p.id,
  src.target_slug
from src
join public.products p on p.sku = src.target_sku
where src.old_slug <> src.target_slug
on conflict (old_slug) do update
set
  target_product_id = excluded.target_product_id,
  target_slug = excluded.target_slug;
""".strip()


def normalize_option_value(value: str) -> str:
    value = normalize_name(value)
    value = value.replace("Warna", "").replace("Colour", "").strip(" ,-")
    return value


def sort_color_key(name: str) -> tuple[int, str]:
    if name == "Default":
        return (999, name)
    return (0, name)


def build_product_records(
    rows: list[dict[str, str]]
) -> tuple[
    list[dict[str, object]],
    list[dict[str, object]],
    list[dict[str, object]],
    list[dict[str, object]],
    set[tuple[str, ...]],
    dict[str, int],
]:
    parents: dict[str, dict[str, object]] = {}
    category_paths: set[tuple[str, ...]] = set()

    for row in rows:
        row_type = (row.get("Tipe") or "").strip().lower()
        if row_type not in {"simple", "variable"}:
            continue
        raw_id = normalize_name(row.get("ID") or "")
        sku = normalize_name(row.get("SKU") or "")
        raw_categories = normalize_name(row.get("Kategori") or "")
        if not raw_categories:
            continue
        primary_path = choose_primary_path(raw_categories)
        if not primary_path:
            continue
        for depth in range(1, len(primary_path) + 1):
            category_paths.add(tuple(primary_path[:depth]))
        name_raw = normalize_name(row.get("Nama") or sku)
        desired_slug = normalize_name((row.get("Meta:_wp_desired_post_slug") or row.get("slug") or ""))
        canonical_sku = sku or synthetic_sku(raw_id, name_raw, desired_slug)
        sku_base, sku_color = extract_base_and_color(sku, sku)
        name_base, name_color = extract_base_and_color(name_raw, canonical_sku)
        if sku_color != "Default" and normalize_name(sku_base) and not re.search(r"\d{2,}", sku_base):
            base_name = normalize_name(sku_base)
        elif name_base and not is_generic_base_name(name_base):
            base_name = normalize_name(name_base)
        else:
            base_name = normalize_name(sku_base or name_base or name_raw or sku)
        display_base_name = normalize_name(name_base if name_base and not is_generic_base_name(name_base) else base_name)
        color_name = sku_color if sku_color != "Default" else name_color
        parent_record = {
            "type": row_type,
            "sku": canonical_sku,
            "source_sku": sku,
            "source_id": raw_id,
            "name_raw": name_raw,
            "base_name": normalize_name(base_name or name_raw or sku),
            "display_base_name": display_base_name,
            "parent_color": normalize_color_name(color_name),
            "category_slug": category_slug(tuple(primary_path)),
            "category_path": primary_path,
            "short_description": clean_text(row.get("Deskripsi singkat") or ""),
            "description": clean_text(row.get("Deskripsi") or ""),
            "featured": (row.get("Apakah diunggulkan?") or "").strip() == "1",
            "images": parse_images(row.get("Gambar-gambar") or ""),
            "regular_price": parse_int(row.get("Harga normal") or ""),
            "sale_price": parse_int(row.get("Harga obral") or ""),
            "stock": parse_int(row.get("Stok") or ""),
            "desired_slug": desired_slug,
        }
        if sku:
            parents[sku] = parent_record
        if raw_id:
            parents[f"id:{raw_id.removeprefix('id:')}"] = parent_record

    groups: dict[tuple[str, str], dict[str, object]] = {}

    def choose_group_category(paths: list[list[str]]) -> tuple[list[str], str]:
        counts: dict[tuple[str, ...], int] = defaultdict(int)
        for path in paths:
            counts[tuple(path)] += 1
        best = sorted(
            counts,
            key=lambda path: (
                PRIMARY_ROOT_PRIORITY.get(path[0], 999),
                -len(path),
                -counts[path],
                path,
            ),
        )[0]
        return list(best), category_slug(best)

    def ensure_group(parent: dict[str, object]) -> dict[str, object]:
        family_name = normalize_family_name(
            str(parent["display_base_name"]) or str(parent["base_name"]) or str(parent["name_raw"])
        )
        if not family_name or is_generic_group_name(family_name):
            key = (str(parent["base_name"]).upper(), str(parent["category_slug"]))
        else:
            key = (family_name, "__family__")
        group = groups.get(key)
        if group is None:
            group = {
                "key": key,
                "base_name": parent["base_name"],
                "category_slug": parent["category_slug"],
                "category_paths": [],
                "featured": False,
                "parent_skus": [],
                "redirect_keys": set(),
                "desired_slugs": set(),
                "names": [],
                "short_descriptions": [],
                "descriptions": [],
                "all_images": [],
                "parents": [],
                "color_buckets": {},
            }
            groups[key] = group
        group["featured"] = bool(group["featured"]) or bool(parent["featured"])
        group["parent_skus"].append(parent["sku"])
        group["redirect_keys"].add(parent["sku"])
        group["category_paths"].append(list(parent["category_path"]))
        if parent["desired_slug"]:
            group["desired_slugs"].add(parent["desired_slug"])
        group["names"].append(parent["display_base_name"])
        if parent["short_description"]:
            group["short_descriptions"].append(parent["short_description"])
        if parent["description"]:
            group["descriptions"].append(parent["description"])
        for img in parent["images"]:
            if img not in group["all_images"]:
                group["all_images"].append(img)
        group["parents"].append(parent)
        return group

    def add_color_record(group: dict[str, object], color_name: str, regular: int, sale: int, stock: int, image: str, source_name: str) -> None:
        color_name = normalize_color_name(color_name)
        bucket = group["color_buckets"].get(color_name)
        if bucket is None:
            bucket = {
                "color_name": color_name,
                "color_hex": color_hex(color_name),
                "records": [],
                "images": [],
                "display_names": [],
            }
            group["color_buckets"][color_name] = bucket
        bucket["records"].append(
            {
                "regular": regular,
                "sale": sale,
                "stock": stock,
                "image": image,
            }
        )
        if image and image not in bucket["images"]:
            bucket["images"].append(image)
        if source_name:
            bucket["display_names"].append(source_name)

    for parent in parents.values():
        group = ensure_group(parent)
        if parent["type"] == "simple":
            color_name = parent["parent_color"] if parent["parent_color"] != "Default" else "Default"
            image = parent["images"][0] if parent["images"] else ""
            add_color_record(
                group,
                color_name,
                int(parent["regular_price"]),
                int(parent["sale_price"]),
                int(parent["stock"]),
                image,
                str(parent["name_raw"]),
            )

    for row in rows:
        if (row.get("Tipe") or "").strip().lower() != "variation":
            continue
        parent_sku = normalize_name(row.get("Induk") or "")
        parent = parents.get(parent_sku)
        if not parent:
            continue
        group = ensure_group(parent)
        attr1_name = normalize_name(row.get("Nama atribut 1") or "")
        attr2_name = normalize_name(row.get("Nama atribut 2") or "")
        attr1_value = normalize_option_value(row.get("Nilai Atribut 1") or "")
        attr2_value = normalize_option_value(row.get("Nilai Atribut 2") or "")
        color_name = "Default"
        if attr1_name.lower() == "color" and attr1_value:
            color_name = attr1_value
        elif attr2_name.lower() == "color" and attr2_value:
            color_name = attr2_value
        elif parent["parent_color"] != "Default":
            color_name = str(parent["parent_color"])
        image_list = parse_images(row.get("Gambar-gambar") or "")
        image = image_list[0] if image_list else (parent["images"][0] if parent["images"] else "")
        add_color_record(
            group,
            color_name,
            parse_int(row.get("Harga normal") or ""),
            parse_int(row.get("Harga obral") or ""),
            parse_int(row.get("Stok") or ""),
            image,
            normalize_name(row.get("Nama") or ""),
        )

    products: list[dict[str, object]] = []
    product_images: list[dict[str, object]] = []
    variants: list[dict[str, object]] = []
    redirects: list[dict[str, object]] = []
    used_slugs: set[str] = set()
    stats = {
        "group_count": 0,
        "product_count": 0,
        "variant_count": 0,
        "redirect_count": 0,
        "skipped_empty_groups": 0,
    }

    def unique_slug(base_slug: str, category_slug_value: str, canonical_sku: str) -> str:
        candidate = base_slug or slugify(canonical_sku)
        if candidate not in used_slugs:
            used_slugs.add(candidate)
            return candidate
        alt = f"{candidate}-{slugify(category_slug_value)}"
        if alt not in used_slugs:
            used_slugs.add(alt)
            return alt
        final = f"{alt}-{slugify(canonical_sku)}"
        used_slugs.add(final)
        return final

    def resolve_record_price(records: list[dict[str, object]]) -> tuple[Optional[int], Optional[int], Optional[int]]:
        priced: list[tuple[int, Optional[int], Optional[int]]] = []
        for rec in records:
            regular = int(rec["regular"])
            sale = int(rec["sale"])
            if sale > 0 and regular > sale:
                priced.append((sale, regular, sale))
            elif regular > 0:
                priced.append((regular, None, None))
        if not priced:
            return None, None, None
        priced.sort(key=lambda item: (item[0], item[1] or 0))
        current, original, sale_price = priced[0]
        if sale_price is not None and original is not None:
            return original, original, sale_price
        return current, None, None

    for group in groups.values():
        stats["group_count"] += 1
        color_buckets: dict[str, dict[str, object]] = group["color_buckets"]
        if not color_buckets:
            stats["skipped_empty_groups"] += 1
            continue
        chosen_category_path, chosen_category_slug = choose_group_category(list(group["category_paths"]))
        group["category_slug"] = chosen_category_slug

        representative = sorted(
            group["parents"],
            key=lambda parent: (
                tuple(parent["category_path"]) != tuple(chosen_category_path),
                not bool(parent["featured"]),
                not bool(parent["images"]),
                int(parent["regular_price"]) <= 0,
                int(parent["stock"]) <= 0,
                str(parent["sku"]),
            ),
        )[0]
        canonical_sku = str(representative["sku"])
        name_value = select_best_text(list(group["names"])) or str(group["base_name"])
        if name_value == canonical_sku or is_generic_base_name(name_value):
            fallback_names: list[str] = []
            for bucket in color_buckets.values():
                for raw_name in bucket["display_names"]:
                    derived_base, _ = extract_base_and_color(str(raw_name), canonical_sku)
                    derived_base = normalize_name(derived_base)
                    if derived_base and not is_generic_base_name(derived_base):
                        fallback_names.append(derived_base)
            fallback_name = select_best_text(fallback_names)
            if fallback_name:
                name_value = fallback_name
        short_description = select_best_text(list(group["short_descriptions"]))
        description = select_best_text(list(group["descriptions"]))
        desired_slug = ""
        if group["desired_slugs"]:
            desired_slug = sorted(group["desired_slugs"], key=lambda value: (len(value), value))[0]
        slug = unique_slug(desired_slug or slugify(name_value), str(group["category_slug"]), canonical_sku)

        variant_rows: list[dict[str, object]] = []
        merged_images: list[str] = []
        total_stock = 0
        price_entries: list[tuple[int, Optional[int], Optional[int]]] = []

        sorted_colors = sorted(color_buckets.values(), key=lambda bucket: sort_color_key(str(bucket["color_name"])))
        for index, bucket in enumerate(sorted_colors):
            records = list(bucket["records"])
            stock = sum(max(int(rec["stock"]), 0) for rec in records)
            total_stock += stock
            price_idr, original_price_idr, sale_price_idr = resolve_record_price(records)
            current_effective = sale_price_idr if sale_price_idr is not None else price_idr
            if current_effective is not None:
                price_entries.append((current_effective, original_price_idr, sale_price_idr))
            image_url = bucket["images"][0] if bucket["images"] else ""
            if image_url and image_url not in merged_images:
                merged_images.append(image_url)
            variant_rows.append(
                {
                    "product_sku": canonical_sku,
                    "color_name": bucket["color_name"],
                    "color_hex": bucket["color_hex"],
                    "image_url": image_url,
                    "stock": stock,
                    "sort_order": index,
                    "price_idr": price_idr,
                    "original_price_idr": original_price_idr,
                    "sale_price_idr": sale_price_idr,
                }
            )

        for img in group["all_images"]:
            if img not in merged_images:
                merged_images.append(img)
        merged_images = merged_images[:16]

        if not price_entries and not merged_images and total_stock <= 0:
            stats["skipped_empty_groups"] += 1
            continue

        base_price_idr = 0
        base_original_price_idr = None
        base_sale_price_idr = None
        if price_entries:
            price_entries.sort(key=lambda item: (item[0], item[1] or 0))
            chosen_current, chosen_original, chosen_sale = price_entries[0]
            if chosen_sale is not None and chosen_original is not None:
                base_price_idr = chosen_original
                base_original_price_idr = chosen_original
                base_sale_price_idr = chosen_sale
            else:
                base_price_idr = chosen_current
        elif int(representative["regular_price"]) > 0:
            base_price_idr = int(representative["regular_price"])
            if int(representative["sale_price"]) > 0 and int(representative["sale_price"]) < base_price_idr:
                base_original_price_idr = base_price_idr
                base_sale_price_idr = int(representative["sale_price"])

        if base_price_idr <= 0:
            stats["skipped_empty_groups"] += 1
            continue

        is_on_sale = base_sale_price_idr is not None
        discount_percent = None
        if base_sale_price_idr is not None and base_price_idr > base_sale_price_idr:
            discount_percent = round((base_price_idr - base_sale_price_idr) * 100 / base_price_idr, 2)

        stock_status = "out_of_stock"
        if total_stock > 5:
            stock_status = "in_stock"
        elif total_stock > 0:
            stock_status = "low_stock"

        products.append(
            {
                "sku": canonical_sku,
                "slug": slug,
                "category_slug": group["category_slug"],
                "name_id": name_value,
                "name_en": name_value,
                "short_description_id": short_description,
                "short_description_en": short_description,
                "description_id": description,
                "description_en": description,
                "price_idr": base_price_idr,
                "original_price_idr": base_original_price_idr,
                "sale_price_idr": base_sale_price_idr,
                "is_on_sale": is_on_sale,
                "discount_percent": discount_percent,
                "is_featured": bool(group["featured"]),
                "stock": total_stock,
                "stock_status": stock_status,
                "images": merged_images,
                "attributes": {
                    "source": "wc_csv_rebuild_2026_06_23",
                    "merged_color_count": len(variant_rows),
                },
            }
        )
        product_images.append({"sku": canonical_sku, "images": merged_images})
        variants.extend(variant_rows)
        stats["product_count"] += 1
        stats["variant_count"] += len(variant_rows)

        redirect_keys = set(group["redirect_keys"])
        for old_key in sorted(redirect_keys):
            if old_key and old_key != slug and old_key != canonical_sku:
                redirects.append({"old_slug": old_key, "target_sku": canonical_sku, "target_slug": slug})
        for old_slug in sorted(group["desired_slugs"]):
            if old_slug and old_slug != slug:
                redirects.append({"old_slug": old_slug, "target_sku": canonical_sku, "target_slug": slug})

    dedup_redirects: dict[str, dict[str, object]] = {}
    for redirect in redirects:
        dedup_redirects[str(redirect["old_slug"])] = redirect
    redirects = sorted(dedup_redirects.values(), key=lambda item: str(item["old_slug"]))
    stats["redirect_count"] = len(redirects)
    return products, product_images, variants, redirects, category_paths, stats | {"redirect_count": len(redirects)}


def write_batches(out_dir: Path, stem: str, items: list[dict[str, object]], batch_size: int, builder) -> int:
    file_count = 0
    for index in range(0, len(items), batch_size):
        batch = items[index:index + batch_size]
        file_count += 1
        filename = f"{stem}_{file_count:02d}.sql"
        (out_dir / filename).write_text(builder(batch), encoding="utf-8")
    return file_count


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Usage: build_wc_full_reset_sql.py <csv_path> <output_dir>")

    csv_path = Path(sys.argv[1])
    out_dir = Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)

    with csv_path.open(newline="", encoding="utf-8-sig") as handle:
        rows = list(csv.DictReader(handle))

    products, product_images, variants, redirects, category_paths, stats = build_product_records(rows)

    (out_dir / "01_categories.sql").write_text(build_category_sql(category_paths), encoding="utf-8")
    (out_dir / "02_reset_products.sql").write_text(build_reset_sql(), encoding="utf-8")
    product_files = write_batches(out_dir, "03_products", products, 120, build_product_batch_sql)
    image_files = write_batches(out_dir, "04_product_images", product_images, 150, build_product_images_batch_sql)
    variant_files = write_batches(out_dir, "05_product_variants", variants, 250, build_variant_batch_sql)
    redirect_files = write_batches(out_dir, "06_redirects", redirects, 300, build_redirect_batch_sql)

    summary = {
        "rows": len(rows),
        "category_paths": len(category_paths),
        "products": len(products),
        "product_images": len(product_images),
        "variants": len(variants),
        "redirects": len(redirects),
        "files": {
            "product_files": product_files,
            "image_files": image_files,
            "variant_files": variant_files,
            "redirect_files": redirect_files,
        },
        "stats": stats,
    }
    (out_dir / "dataset.products.json").write_text(json.dumps(products, ensure_ascii=False, indent=2), encoding="utf-8")
    (out_dir / "dataset.product_images.json").write_text(json.dumps(product_images, ensure_ascii=False, indent=2), encoding="utf-8")
    (out_dir / "dataset.variants.json").write_text(json.dumps(variants, ensure_ascii=False, indent=2), encoding="utf-8")
    (out_dir / "dataset.redirects.json").write_text(json.dumps(redirects, ensure_ascii=False, indent=2), encoding="utf-8")
    (out_dir / "dataset.category_paths.json").write_text(
        json.dumps([list(path) for path in sorted(category_paths, key=lambda item: (len(item), item))], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (out_dir / "manifest.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
