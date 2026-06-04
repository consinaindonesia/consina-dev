import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const STOCK_VALUES = ["in_stock", "low_stock", "out_of_stock"] as const;

const RowSchema = z.object({
  sku: z.string().trim().min(1).max(100),
  category_slug: z.string().trim().max(100).optional().default(""),
  category_path: z.string().trim().max(2000).optional().default(""),
  name_id: z.string().trim().max(500).default(""),
  name_en: z.string().trim().max(500).default(""),
  short_description_id: z.string().max(1000).optional().default(""),
  short_description_en: z.string().max(1000).optional().default(""),
  description_id: z.string().max(20000).optional().default(""),
  description_en: z.string().max(20000).optional().default(""),
  price_idr: z.number().int().min(0).max(1_000_000_000),
  capacity: z.string().max(100).optional().default(""),
  weight_grams: z.number().int().min(0).max(1_000_000).nullable().optional(),
  stock_status: z.enum(STOCK_VALUES).optional().default("in_stock"),
}).refine((r) => (r.category_slug && r.category_slug.length > 0) || (r.category_path && r.category_path.length > 0), {
  message: "Either category_slug or category_path is required",
  path: ["category_slug"],
});

const ImportInput = z.object({
  rows: z.array(RowSchema).min(1).max(2000),
  updateExisting: z.boolean().default(false),
});

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "category";
}

export const importProductsCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ImportInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, claims } = context;
    const email = (claims as { email?: string }).email;
    if (!email) throw new Error("Unauthorized");

    const { data: admin } = await supabase
      .from("admin_users")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (!admin?.id) throw new Error("Admin profile not found");

    // Pre-load all categories once for path resolution + slug lookups
    const { data: allCats, error: catErr } = await supabase
      .from("categories")
      .select("id, slug, name_en, name_id, parent_category_id");
    if (catErr) throw new Error(catErr.message);
    type Cat = { id: string; slug: string; name_en: string; name_id: string; parent_category_id: string | null };
    const cats: Cat[] = (allCats ?? []) as Cat[];
    const slugToId = new Map(cats.map((c) => [c.slug, c.id]));
    const allSlugs = new Set(cats.map((c) => c.slug));
    // Index children by parent id (null parent => root)
    const childrenByParent = new Map<string | null, Cat[]>();
    for (const c of cats) {
      const k = c.parent_category_id;
      const arr = childrenByParent.get(k) ?? [];
      arr.push(c);
      childrenByParent.set(k, arr);
    }

    const pathCache = new Map<string, string>(); // normalized path -> leaf id

    async function ensureCategoryNode(name: string, parentId: string | null): Promise<string> {
      const lc = name.trim().toLowerCase();
      const siblings = childrenByParent.get(parentId) ?? [];
      const found = siblings.find(
        (c) =>
          c.name_en.trim().toLowerCase() === lc ||
          c.name_id.trim().toLowerCase() === lc ||
          c.slug.toLowerCase() === lc,
      );
      if (found) return found.id;

      // Generate unique slug
      const base = slugify(name);
      let slug = base;
      let n = 1;
      while (allSlugs.has(slug)) {
        n++;
        slug = `${base}-${n}`;
      }
      const { data: created, error: insErr } = await supabase
        .from("categories")
        .insert({
          slug,
          name_en: name.trim(),
          name_id: name.trim(),
          parent_category_id: parentId,
        })
        .select("id, slug, name_en, name_id, parent_category_id")
        .single();
      if (insErr || !created) throw new Error(insErr?.message ?? "Failed to create category");
      const newCat: Cat = created as Cat;
      cats.push(newCat);
      slugToId.set(newCat.slug, newCat.id);
      allSlugs.add(newCat.slug);
      const arr = childrenByParent.get(parentId) ?? [];
      arr.push(newCat);
      childrenByParent.set(parentId, arr);
      return newCat.id;
    }

    async function resolvePath(rawPath: string): Promise<string> {
      const norm = rawPath
        .split(">")
        .map((s) => s.trim())
        .filter(Boolean)
        .join(" > ");
      if (!norm) throw new Error("Empty category path");
      const cached = pathCache.get(norm.toLowerCase());
      if (cached) return cached;
      const segments = norm.split(" > ");
      let parent: string | null = null;
      let leafId = "";
      for (const seg of segments) {
        leafId = await ensureCategoryNode(seg, parent);
        parent = leafId;
      }
      pathCache.set(norm.toLowerCase(), leafId);
      return leafId;
    }

    // Per-row: resolve a list of category ids (first is primary)
    async function resolveRowCategoryIds(row: typeof data.rows[number]): Promise<string[]> {
      const ids: string[] = [];
      const seen = new Set<string>();
      const push = (id: string) => {
        if (!seen.has(id)) {
          seen.add(id);
          ids.push(id);
        }
      };
      const pathStr = (row.category_path ?? "").trim();
      if (pathStr) {
        const paths = pathStr.split("|").map((p) => p.trim()).filter(Boolean);
        for (const p of paths) {
          const id = await resolvePath(p);
          push(id);
        }
      }
      const slug = (row.category_slug ?? "").trim();
      if (slug) {
        const id = slugToId.get(slug);
        if (!id) throw new Error(`Unknown category slug: ${slug}`);
        push(id);
      }
      if (ids.length === 0) throw new Error("No category resolved");
      return ids;
    }

    // Existing SKUs
    const skus = data.rows.map((r) => r.sku);
    const { data: existing, error: exErr } = await supabase
      .from("products")
      .select("id, sku")
      .in("sku", skus);
    if (exErr) throw new Error(exErr.message);
    const skuToId = new Map((existing ?? []).map((p) => [p.sku as string, p.id as string]));

    const errors: Array<{ sku: string; error: string }> = [];
    const insertedIds: string[] = [];
    const updatedIds: string[] = [];

    for (const row of data.rows) {
      let categoryIds: string[];
      try {
        categoryIds = await resolveRowCategoryIds(row);
      } catch (e) {
        errors.push({ sku: row.sku, error: (e as Error).message });
        continue;
      }
      const primaryId = categoryIds[0];
      const existingId = skuToId.get(row.sku);
      const payload = {
        sku: row.sku,
        category_id: primaryId,
        name_id: row.name_id || row.name_en,
        name_en: row.name_en || row.name_id,
        short_description_id: row.short_description_id || null,
        short_description_en: row.short_description_en || null,
        description_id: row.description_id || null,
        description_en: row.description_en || null,
        price_idr: row.price_idr,
        capacity: row.capacity || null,
        weight_grams: row.weight_grams ?? null,
        stock_status: row.stock_status,
      };

      let productId: string | null = null;
      if (existingId) {
        if (!data.updateExisting) {
          errors.push({ sku: row.sku, error: "SKU already exists" });
          continue;
        }
        const { error: upErr } = await supabase
          .from("products")
          .update(payload)
          .eq("id", existingId);
        if (upErr) {
          errors.push({ sku: row.sku, error: upErr.message });
          continue;
        }
        updatedIds.push(existingId);
        productId = existingId;
      } else {
        const { data: inserted, error: insErr } = await supabase
          .from("products")
          .insert(payload)
          .select("id")
          .single();
        if (insErr || !inserted) {
          errors.push({ sku: row.sku, error: insErr?.message ?? "Insert failed" });
          continue;
        }
        insertedIds.push(inserted.id as string);
        productId = inserted.id as string;
      }

      // Sync product_categories join rows
      if (productId) {
        const rows = categoryIds.map((cid, i) => ({
          product_id: productId!,
          category_id: cid,
          is_primary: i === 0,
        }));
        const { error: pcErr } = await supabase
          .from("product_categories")
          .upsert(rows, { onConflict: "product_id,category_id" });
        if (pcErr) {
          errors.push({ sku: row.sku, error: `Category link failed: ${pcErr.message}` });
        }
      }
    }

    await supabase.from("activity_log").insert({
      admin_user_id: admin.id,
      action: "csv_import",
      entity_type: "product",
    });

    return {
      inserted: insertedIds.length,
      updated: updatedIds.length,
      failed: errors.length,
      insertedIds,
      updatedIds,
      errors,
    };
  });