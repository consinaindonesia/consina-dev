import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  fetchOdooInventorySnapshot,
  getOdooConfigStatus,
  processOdooInventoryPayload,
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
        limit: z.number().int().min(1).max(5000).optional(),
      })
      .optional()
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Not authorized");

    const payload = await fetchOdooInventorySnapshot(data?.limit ?? 1000);
    const result = await processOdooInventoryPayload(payload);
    return {
      ...result,
      source: "manual_odoo_pull",
      fetched: payload.lines.length,
    };
  });
