import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const STOCK_VALUES = ["in_stock", "low_stock", "out_of_stock"] as const;

const RowSchema = z.object({
  sku: z.string().trim().min(1).max(100),
  category_slug: z.string().trim().min(1).max(100),
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
});

const ImportInput = z.object({
  rows: z.array(RowSchema).min(1).max(2000),
  updateExisting: z.boolean().default(false),
});

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

    // Map category slugs -> ids
    const slugs = Array.from(new Set(data.rows.map((r) => r.category_slug)));
    const { data: cats, error: catErr } = await supabase
      .from("categories")
      .select("id, slug")
      .in("slug", slugs);
    if (catErr) throw new Error(catErr.message);
    const slugToId = new Map((cats ?? []).map((c) => [c.slug as string, c.id as string]));

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
      const categoryId = slugToId.get(row.category_slug);
      if (!categoryId) {
        errors.push({ sku: row.sku, error: `Unknown category slug: ${row.category_slug}` });
        continue;
      }
      const existingId = skuToId.get(row.sku);
      const payload = {
        sku: row.sku,
        category_id: categoryId,
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