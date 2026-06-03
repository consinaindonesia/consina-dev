# Product Color Variants

Add per-product color variants with admin editor and automatic public display.

## 1. Database

New migration creating `public.product_variants`:

- `id uuid pk default gen_random_uuid()`
- `product_id uuid not null` (logical FK to products.id)
- `color_name text not null`
- `color_hex text not null` (validated format `#RRGGBB`)
- `image_url text null`
- `stock integer null`
- `sort_order integer not null default 0`
- `created_at`, `updated_at` timestamptz with `set_updated_at` trigger

GRANTs:
- `anon, authenticated`: SELECT (variants of active products, enforced via RLS using EXISTS on products)
- `authenticated`: full CRUD via `is_admin_or_editor()`
- `service_role`: ALL

RLS:
- `public read product_variants of active products` — SELECT for anon/authenticated where parent product `is_active = true`
- `staff manage product_variants` — ALL for `is_admin_or_editor()`

Index on `(product_id, sort_order)`.

## 2. Admin UI (`src/components/admin/ProductForm.tsx`)

Add new tab **"Variants"** after Images (or a card inside Basic Info — using a tab to keep parity with existing image tab).

New component `src/components/admin/ProductVariantsTab.tsx`:
- Loads existing variants on mount via `supabase.from("product_variants").select(...).eq("product_id", id).order("sort_order")`.
- Local state array of rows; each row: `{ id?, color_name, color_hex, image_url, stock, sort_order }`.
- Buttons: **+ Add color**, per-row delete, up/down reorder.
- Inputs per row: name (text), hex (text + `<input type="color">` swatch synced), stock (number), image upload (reusing existing storage bucket `product-images`).
- Save handler: diff against initial → upsert changed/new rows, delete removed rows. Hook into the existing product save flow (call from parent ProductForm after product upsert) or expose a `Save variants` button on the tab if simpler. Prefer integrating into the parent submit so it saves atomically with the product.

For the "new" mode (no product id yet), keep variants in local state and persist after the product row is inserted.

## 3. Public display

### Product detail (`src/pages/ProductDetail.tsx`)
- Fetch variants for the product (`product_variants` ordered by `sort_order`).
- Render swatch row: circular buttons styled with `background-color: var(--hex)` and accessible labels (color name).
- On select, if `image_url` set, switch the main product image to that URL. Show selected color name and (if `stock` set) the variant stock.

### Product cards
- Extend `usePublicProducts` (and the category page query in `src/routes/c.$slug.tsx`) to also pull variants: `product_variants(color_hex, sort_order)`.
- Add `variants: { color_hex: string }[]` to `PublicProduct` type.
- In product cards (catalog, category, home featured), render up to ~5 small color dots below the title when variants exist.

## 4. Files

- `supabase/migrations/<timestamp>_product_variants.sql` (new)
- `src/components/admin/ProductVariantsTab.tsx` (new)
- `src/components/admin/ProductForm.tsx` (edit — add tab + wire save)
- `src/lib/public-products.ts` (edit — include variants in select + type)
- `src/pages/ProductDetail.tsx` (edit — swatch UI + image switch)
- `src/routes/catalog.tsx` (edit — dots on cards)
- `src/routes/c.$slug.tsx` (edit — include variants in query + dots on cards)
- Optionally `src/routes/index.tsx` featured cards (dots).

## 5. Out of scope

- No price-per-variant (only stock).
- No size variants (colors only as requested).
- No cart/checkout integration of selected color beyond display (existing inquiry/order flow unchanged).
