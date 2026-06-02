import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function isProduction(): boolean {
  const key = process.env.MIDTRANS_SERVER_KEY ?? "";
  // Sandbox server keys are prefixed with "SB-Mid-server-".
  return !key.startsWith("SB-");
}

function snapBaseUrl(): string {
  return isProduction()
    ? "https://app.midtrans.com/snap/v1"
    : "https://app.sandbox.midtrans.com/snap/v1";
}

function apiBaseUrl(): string {
  return isProduction()
    ? "https://api.midtrans.com/v2"
    : "https://api.sandbox.midtrans.com/v2";
}

function basicAuthHeader(): string {
  const key = process.env.MIDTRANS_SERVER_KEY ?? "";
  return "Basic " + Buffer.from(key + ":").toString("base64");
}

function adminClient() {
  const url = process.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Supabase server config missing");
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Public: create a Midtrans Snap transaction for an order.
 * Returns the Snap redirect URL the customer should be sent to.
 */
export const createMidtransSnap = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ orderId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    if (!process.env.MIDTRANS_SERVER_KEY) {
      throw new Error("Midtrans is not configured");
    }
    const supabase = adminClient();
    const { data: order, error } = await supabase
      .from("orders")
      .select(
        "id, customer_name, customer_email, customer_phone, total_idr, payment_status, payment_method, order_items(product_name, sku, quantity, unit_price_idr)",
      )
      .eq("id", data.orderId)
      .maybeSingle();
    if (error || !order) throw new Error("Order not found");
    if (order.payment_status === "paid" || order.payment_status === "refunded") {
      throw new Error("Order already settled");
    }

    const items = ((order.order_items ?? []) as Array<{
      product_name: string | null;
      sku: string | null;
      quantity: number;
      unit_price_idr: number;
    }>).map((it, idx) => ({
      id: it.sku || `item-${idx}`,
      name: (it.product_name || "Item").slice(0, 50),
      price: it.unit_price_idr,
      quantity: it.quantity,
    }));

    const [firstName, ...rest] = (order.customer_name || "Customer").split(" ");

    const payload = {
      transaction_details: {
        order_id: order.id,
        gross_amount: order.total_idr,
      },
      item_details: items.length ? items : undefined,
      customer_details: {
        first_name: firstName,
        last_name: rest.join(" ") || undefined,
        email: order.customer_email,
        phone: order.customer_phone || undefined,
      },
      credit_card: { secure: true },
    };

    const res = await fetch(`${snapBaseUrl()}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: basicAuthHeader(),
      },
      body: JSON.stringify(payload),
    });
    const body = (await res.json()) as {
      token?: string;
      redirect_url?: string;
      error_messages?: string[];
    };
    if (!res.ok || !body.token || !body.redirect_url) {
      console.error("Midtrans Snap error", res.status, body);
      throw new Error(
        body.error_messages?.join("; ") || `Midtrans error (${res.status})`,
      );
    }

    await supabase
      .from("orders")
      .update({
        payment_provider: "midtrans",
        payment_method: "midtrans",
        payment_reference: body.token,
        payment_status: "pending",
      })
      .eq("id", order.id);

    return { redirectUrl: body.redirect_url, token: body.token };
  });

/**
 * Admin: refund a paid Midtrans order.
 */
export const refundMidtransOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        orderId: z.string().uuid(),
        reason: z.string().min(1).max(255).optional(),
        amount: z.number().int().positive().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // Admin check via security definer function.
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Not authorized");

    const supabase = adminClient();
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, total_idr, payment_status, payment_provider")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error || !order) throw new Error("Order not found");
    if (order.payment_provider !== "midtrans") {
      throw new Error("Order was not paid via Midtrans");
    }
    if (order.payment_status !== "paid") {
      throw new Error("Only paid orders can be refunded");
    }

    const res = await fetch(`${apiBaseUrl()}/${order.id}/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: basicAuthHeader(),
      },
      body: JSON.stringify({
        refund_key: `rf-${order.id}-${Date.now()}`,
        amount: data.amount ?? order.total_idr,
        reason: data.reason || "Refunded by admin",
      }),
    });
    const body = (await res.json()) as {
      status_code?: string;
      status_message?: string;
    };
    // Midtrans returns 200 with status_code "200" on success.
    if (!res.ok || (body.status_code && body.status_code !== "200")) {
      console.error("Midtrans refund error", res.status, body);
      throw new Error(body.status_message || `Refund failed (${res.status})`);
    }

    await supabase
      .from("orders")
      .update({
        payment_status: "refunded",
        status: "cancelled",
        refunded_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    return { ok: true };
  });