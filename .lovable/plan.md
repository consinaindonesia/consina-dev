## What's already in place (do not rebuild)

- `categories.parent_category_id` FK + index + self-FK already exist.
- Admin `/admin/categories` already has a full drag-and-drop tree (dnd-kit) with parent selection and depth.
- `usePublicCategories()` already returns a nested tree.
- CSV importer (`CsvImportWizard`) and admin importer entry already exist.

So the actual gaps are: many-to-many, dynamic nested nav rendering, hierarchical breadcrumbs, and importer support for category paths and Activity tags.

---

## 1. Database: product↔category many-to-many (new)

New table `public.product_categories`:
- `product_id uuid` → `products(id) ON DELETE CASCADE`
- `category_id uuid` → `categories(id) ON DELETE CASCADE`
- `is_primary boolean default false`
- PK `(product_id, category_id)`, index on `category_id`.
- GRANTs: `SELECT` to anon+authenticated; `INSERT/UPDATE/DELETE` to authenticated (gated by RLS); `ALL` to service_role.
- RLS: public can read rows whose product is `is_active=true`; staff (admin/editor via existing `is_admin_or_editor()`) can manage.

Keep the existing `products.category_id` column untouched as the "primary" category — fully backward-compatible with current code, cart, checkout, product cards, and category pages. The new table only adds extra category memberships.

Backfill: insert one `(product_id, products.category_id, is_primary=true)` row per existing product so listing-by-category through the join works immediately for current data.

No other tables modified.

## 2. Admin Categories page

No structural change — keep the existing tree + drag-drop UI exactly as is. Only verify it still works after the migration (it doesn't touch the new join table).

## 3. Admin Product editor

Add one section to `ProductForm.tsx` "Basic info" tab: **Additional categories** (multi-select chips), separate from the existing single "Primary category" dropdown. Stores extra rows in `product_categories`. On save:
- Upsert primary `(product_id, primary_category_id, is_primary=true)`.
- Diff additional categories against existing non-primary rows and insert/delete.

This is additive — the existing primary category field stays as-is.

## 4. Public site: nested rendering

- **Nav "Belanja" dropdown** (`src/components/site/Nav.tsx`): render the tree from `usePublicCategories()` as a 2-level mega-list (parent column with child links underneath). Mobile menu: render parent + indented children.
- **Breadcrumbs**: add a helper `getCategoryAncestors(slug)` in `lib/public-products.ts`; product detail and category pages prepend the ancestor chain (Home › Apparel › Jaket › Softshell › Product).
- **Category pages** (`/c/$slug`): when the category has children, also include products from descendant categories via the new `product_categories` join (`category_id in (cat + descendants)`). Today it filters by `products.category_id` only — switch to the join and dedupe.

Visuals unchanged — only data source/structure updates within existing markup.

## 5. Activity tags

Treat activities as a top-level "Activities" parent category with children: Hiking, Running, Urban, Camping, Travelling. Created via one-time seed migration (idempotent `ON CONFLICT (slug) DO NOTHING`). Products attach via the same `product_categories` table — no separate "tags" concept needed.

## 6. CSV importer additions

Extend `CsvImportWizard.tsx`:
- New column `category_path` accepts `Apparel > Jaket > Softshell` (or `|`-separated multiple paths for cross-listing, e.g. `Apparel > Jaket > Softshell | Activities > Hiking`).
- Resolver walks/creates the path top-down (creates missing nodes with slugified names, `is_active=true`, appended `sort_order`).
- First path becomes `products.category_id` (primary); all paths inserted into `product_categories`.
- Slugs: if `slug` cell empty, derive from `name_en`/`name_id` and ensure uniqueness by appending `-2`, `-3`, … on conflict.
- Per-row validation errors collected into the existing error report panel; valid rows still imported.

Other CSV fields (name, SKU, price, sale_price, stock, image URLs, description, SEO) already supported — only category resolution and slug auto-generation are added.

## 7. Out of scope (explicit)

Cart, checkout, Midtrans, color variants, size variants, pricing/discount logic, product cards, category carousel, and the admin shell remain untouched. PriceDisplay, ProductDetail layout, and admin Categories tree UI are not restyled.

## Technical details

- New migration file timestamps after latest. Includes `CREATE TABLE`, GRANTs, RLS, policies, backfill, and Activities seed in one file.
- New TS types regenerated in `src/integrations/supabase/types.ts` after migration approval.
- `lib/public-products.ts`: add `fetchCategoryDescendants(slug)` (recursive CTE via `rpc` or client-side walk over the cached tree) and update `fetchProductsByCategory` to use the join + descendants.
- `Nav.tsx`: replace flat `categories.map` with a small `<CategoryTree>` renderer (only inside the dropdown).
- `ProductForm.tsx`: add a `MultiSelect`-style chip input that reuses existing flattened category list with `Parent > Child` labels.
- `CsvImportWizard.tsx`: add a `resolveCategoryPath(path)` helper and a unique-slug helper; otherwise no UI changes.

After the migration runs, code wiring lands in one pass and I verify: (a) existing products still list under their category page, (b) a product can be added to a second category and shows in both, (c) Belanja dropdown shows nested children, (d) breadcrumbs include ancestors, (e) CSV import with `category_path` creates missing parents and routes products correctly.
