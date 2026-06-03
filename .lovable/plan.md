## Goal

Extend the catalog to support **size (and other option-type) variants with per-variant SKU/price/stock/image**, **discount pricing**, and **admin-managed size guides** assignable per category. Keep existing color variants, product cards, cart/checkout, and Consina design untouched unless strictly required.

## Data model (new migration)

Three new tables + a few additive columns. No destructive changes to existing tables.

```text
products
  + original_price_idr int null            -- "coret" price
  + sale_price_idr     int null            -- if set, this is what customers pay
  + is_on_sale         bool default false  -- explicit promo flag (queryable)
  + size_guide_id      uuid null           -- optional direct override

product_option_types  (per product: "Ukuran", "Lebar", ...)
  id, product_id, name, sort_order

product_option_values (custom free-text values: "S","M","41","42")
  id, option_type_id, value, sort_order

product_size_variants (the combinations table — separate from product_variants/colors)
  id, product_id,
  option_values uuid[]   -- references product_option_values.id (1+ values per row)
  sku text null, price_idr int null, original_price_idr int null,
  stock int default 0, image_url text null, sort_order int

size_guides
  id, name, description, rows jsonb  -- [{label:"S", chest:"90", ...}], headers jsonb

category_size_guides
  category_id (pk), size_guide_id
```

RLS: public-read for active products' children; staff (`is_admin_or_editor`) manage. Mirror existing `product_variants` policies. Grants for `anon` (select) + `authenticated` + `service_role`.

Color variants (`product_variants`) are unchanged.

## Admin

- **ProductForm — Pricing fields**: add `original_price_idr`, `sale_price_idr`, `is_on_sale` inputs to the Basic Info tab (small block under price). New mode keeps them empty.
- **New "Size Variants" tab** in `ProductForm` (separate from existing Color Variants tab):
  - Option-type editor: add types with custom names + free-text values.
  - Auto-generated combinations table; each row has SKU, price, original price, stock, image upload.
  - Supports staged mode (in memory before first save) like ProductVariantsTab.
- **Size Guides admin** (`/admin/size-guides`): list/create/edit guides with header row + rows table (JSON-backed). Assign guides to categories from the category editor (or inside the guide).

## Public site

- `usePublicProducts` / product detail query: include `size_variants`, `option_types`, `option_values`, sale fields, and resolved size guide.
- **Cards/listings**: if size variants have multiple prices, show "Rp X – Rp Y". If `sale_price_idr` set, render struck-through original + sale price + `-NN%` badge. Color dots stay as-is.
- **Product detail**:
  - Show size selector (radio chips per option type) alongside existing color picker.
  - Selecting a combination updates displayed price, stock/availability, and (if present) variant image. Out-of-stock combos are visually disabled.
  - "Panduan Ukuran" button next to the size selector → Dialog showing the assigned size guide table. Hidden if no guide.
- Inquiry/checkout payloads include the selected size variant id + label so existing flow keeps working.

## Backward compatibility

- All new columns nullable / defaulted; products with no size variants behave exactly as today (single price, single stock).
- Existing `product_variants` (colors) untouched. Cards still render color dots from the same shape.
- Shared `usePublicProducts` returns same fields plus new optional ones — consumers ignore unknowns.
- No styling/layout changes to existing components beyond appending the new UI blocks.

## File plan

New:
- `supabase/migrations/<ts>_size_variants_and_promos.sql`
- `src/components/admin/ProductSizeVariantsTab.tsx`
- `src/components/admin/SizeGuidePicker.tsx`
- `src/routes/admin/size-guides.tsx` (+ edit route)
- `src/components/site/SizeGuideDialog.tsx`
- `src/components/site/PriceDisplay.tsx` (small helper for sale/range; opt-in)

Edited (minimal, additive):
- `src/components/admin/ProductForm.tsx` — add pricing fields + new tab + save logic for size variants/option types.
- `src/lib/public-products.ts` — extend query/normalize with new tables + sale fields.
- `src/pages/ProductDetail.tsx` — size selector, size-guide button, sale price rendering.
- Card components used in `routes/index.tsx`, `routes/catalog.tsx`, `routes/c.$slug.tsx` — call `PriceDisplay` instead of inline price (keep markup/classes the same).

## Out of scope (per instructions)

- No refactor of cart/checkout/Midtrans logic beyond passing the selected variant id.
- No design changes to category carousel, brand story, footer, etc.
- No edits to auto-generated files (`types.ts`, `routeTree.gen.ts` manually).

Proceeding will start with the database migration (needs your approval), then admin UI, then public surfaces.
