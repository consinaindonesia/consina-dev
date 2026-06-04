import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  const url = process.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Supabase server config missing");
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const InputSchema = z.object({
  code: z.string().min(1).max(64),
  subtotal_idr: z.number().int().min(0).max(1_000_000_000),
});

export type VoucherApplyResult = {
  ok: boolean;
  error?: string;
  code?: string;
  discount_idr?: number;
  discount_type?: "percent" | "fixed";
  discount_value?: number;
};

/**
 * Validate a voucher code and compute the discount for a given subtotal.
 * This is read-only — does NOT increment used_count. That happens when an
 * order is created (see redeemVoucher).
 */
export const validateVoucher = createServerFn({ method: "POST" })
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<VoucherApplyResult> => {
    const supabase = adminClient();
    const code = data.code.trim().toUpperCase();
    const { data: row, error } = await supabase
      .from("voucher_codes")
      .select(
        "code, discount_type, discount_value, min_spend_idr, usage_limit, used_count, expires_at, is_active",
      )
      .ilike("code", code)
      .maybeSingle();

    if (error || !row) {
      return { ok: false, error: "Voucher not found" };
    }
    if (!row.is_active) return { ok: false, error: "Voucher is inactive" };
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return { ok: false, error: "Voucher has expired" };
    }
    if (row.usage_limit != null && row.used_count >= row.usage_limit) {
      return { ok: false, error: "Voucher usage limit reached" };
    }
    if (data.subtotal_idr < row.min_spend_idr) {
      return {
        ok: false,
        error: `Minimum spend Rp ${row.min_spend_idr.toLocaleString("id-ID")}`,
      };
    }

    let discount = 0;
    if (row.discount_type === "percent") {
      discount = Math.floor((data.subtotal_idr * row.discount_value) / 100);
    } else {
      discount = row.discount_value;
    }
    discount = Math.min(discount, data.subtotal_idr);

    return {
      ok: true,
      code: row.code,
      discount_idr: discount,
      discount_type: row.discount_type as "percent" | "fixed",
      discount_value: row.discount_value,
    };
  });

/**
 * Atomically increment used_count for a voucher after a successful order
 * insert. Best-effort: never throws to caller.
 */
export const redeemVoucher = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ code: z.string().min(1).max(64) }).parse(input))
  .handler(async ({ data }) => {
    const supabase = adminClient();
    const code = data.code.trim().toUpperCase();
    const { data: row } = await supabase
      .from("voucher_codes")
      .select("id, used_count")
      .ilike("code", code)
      .maybeSingle();
    if (!row) return { ok: false };
    await supabase
      .from("voucher_codes")
      .update({ used_count: (row.used_count ?? 0) + 1 })
      .eq("id", row.id);
    return { ok: true };
  });