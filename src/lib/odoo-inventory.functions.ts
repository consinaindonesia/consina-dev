import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  fetchOdooInventorySnapshot,
  getOdooConfigStatus,
  processOdooInventoryPayload,
  suggestOdooInventoryMapping,
} from "@/lib/odoo-inventory";

export const getOdooInventoryConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Not authorized");
    return getOdooConfigStatus();
  });

export const pullOdooInventorySnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        limit: z.number().int().min(1).max(100).optional(),
        offset: z.number().int().min(0).max(20000).optional(),
      })
      .optional()
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Not authorized");

    const payload = await fetchOdooInventorySnapshot(data?.limit ?? 100, data?.offset ?? 0);
    const result = await processOdooInventoryPayload(payload);
    return {
      ...result,
      source: "manual_odoo_pull",
      fetched: payload.lines.length,
      offset: data?.offset ?? 0,
    };
  });

export const autoMatchOdooInventorySku = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      sku: z.string().min(1),
      reference: z.string().optional().nullable(),
      payload: z.record(z.string(), z.unknown()).optional().nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Not authorized");

    return suggestOdooInventoryMapping({
      sku: data.sku,
      reference: data.reference,
      payload: data.payload ?? null,
    });
  });
