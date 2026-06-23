import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function serverKey(): string {
  return (process.env.MIDTRANS_SERVER_KEY ?? "").trim();
}

function clientKey(): string {
  return (process.env.MIDTRANS_CLIENT_KEY ?? "").trim();
}

/**
 * Resolve sandbox vs production. Priority:
 *   1. Explicit MIDTRANS_ENV override ("production" | "live" | "sandbox" | "test")
 *   2. Server key prefix: "SB-" => sandbox, otherwise production
 * Default is sandbox when no key is set.
 */
function isProduction(): boolean {
  const override = (process.env.MIDTRANS_ENV ?? "").toLowerCase().trim();
  if (override === "production" || override === "live") return true;
  if (override === "sandbox" || override === "test") return false;
  const k = serverKey();
  if (!k) return false;
  return !k.startsWith("SB-");
}

/**
 * Validate that both keys are present and belong to the same Midtrans
 * environment. Throws with a clear message otherwise so the "Pay now"
 * button surfaces a real error instead of Midtrans's generic
 * "Access denied due to unauthorized transaction".
 */
function assertMidtransKeys(): void {
  const sk = serverKey();
  const ck = clientKey();
  if (!sk) throw new Error("MIDTRANS_SERVER_KEY is not set");
  if (!ck) throw new Error("MIDTRANS_CLIENT_KEY is not set");
  const skSandbox = sk.startsWith("SB-");
  const ckSandbox = ck.startsWith("SB-");
  // Both Midtrans key types use "Mid-client-..." / "Mid-server-..." infixes;
  // surface an obvious swap.
  if (/server/i.test(ck) || /client/i.test(sk)) {
    throw new Error(
      "Midtrans keys appear swapped: server key must be the Server Key and client key must be the Client Key",
    );
  }
  if (skSandbox !== ckSandbox) {
    throw new Error(
      `Midtrans key environment mismatch: server key is ${
        skSandbox ? "sandbox" : "production"
      } but client key is ${ckSandbox ? "sandbox" : "production"}. Use matching keys from the same Midtrans environment.`,
    );
  }
  const override = (process.env.MIDTRANS_ENV ?? "").toLowerCase().trim();
  if ((override === "production" || override === "live") && skSandbox) {
    throw new Error(
      "MIDTRANS_ENV=production but the configured keys are sandbox (SB-). Use production keys from a verified account or unset MIDTRANS_ENV.",
    );
  }
  if ((override === "sandbox" || override === "test") && !skSandbox) {
    throw new Error(
      "MIDTRANS_ENV=sandbox but the configured keys are production. Use sandbox keys (SB-...) or unset MIDTRANS_ENV.",
    );
  }
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
  return "Basic " + Buffer.from(serverKey() + ":").toString("base64");
}

function sanitizeMidtransText(
  value: string | null | undefined,
  fallback: string,
  maxLength = 50,
): string {
  const cleaned = String(value ?? fallback)
    .replace(/\s+/g, " ")
    .replace(/[\r\n\t]+/g, " ")
    .trim();
  const normalized = cleaned || fallback;
  return normalized.slice(0, maxLength);
}

function sanitizeMidtransId(value: string | null | undefined, fallback: string): string {
  const cleaned = sanitizeMidtransText(value, fallback, 50).replace(/[^a-zA-Z0-9._\-]/g, "-");
  return cleaned || fallback;
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
    assertMidtransKeys();
    console.log(
      `[midtrans] creating snap (env=${isProduction() ? "production" : "sandbox"}, server_key_prefix=${serverKey().slice(0, 11)})`,
    );
    const supabase = adminClient();
    const { data: order, error } = await supabase
      .from("orders")
      .select(
        "id, customer_name, customer_email, customer_phone, total_idr, subtotal_idr, shipping_idr, voucher_discount_idr, payment_status, payment_method, shipping_method, order_items(product_name, sku, quantity, unit_price_idr, line_total_idr)",
      )
      .eq("id", data.orderId)
      .maybeSingle();
    if (error || !order) throw new Error("Order not found");
    if (order.payment_status === "paid" || order.payment_status === "refunded") {
      throw new Error("Order already settled");
    }

    const orderItems = ((order.order_items ?? []) as Array<{
      product_name: string | null;
      sku: string | null;
      quantity: number;
      unit_price_idr: number;
      line_total_idr: number;
    }>)
      .filter((it) => Number(it.quantity ?? 0) > 0 && Number(it.unit_price_idr ?? 0) >= 0);

    const items = orderItems.map((it, idx) => ({
      id: sanitizeMidtransId(it.sku, `item-${idx + 1}`),
      name: sanitizeMidtransText(it.product_name, `Item ${idx + 1}`),
      price: Math.max(0, Math.round(Number(it.unit_price_idr ?? 0))),
      quantity: Math.max(1, Math.round(Number(it.quantity ?? 1))),
    }));

    if ((order.shipping_idr ?? 0) > 0) {
      items.push({
        id: "shipping",
        name: sanitizeMidtransText(
          order.shipping_method ? `Shipping ${order.shipping_method}` : "Shipping",
          "Shipping",
        ),
        price: Math.round(Number(order.shipping_idr ?? 0)),
        quantity: 1,
      });
    }

    if ((order.voucher_discount_idr ?? 0) > 0) {
      items.push({
        id: "discount",
        name: "Order Discount",
        price: -Math.round(Number(order.voucher_discount_idr ?? 0)),
        quantity: 1,
      });
    }

    const itemTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const itemDetails =
      itemTotal === Math.round(Number(order.total_idr ?? 0))
        ? items
        : [
            {
              id: sanitizeMidtransId(order.id, "order-payment"),
              name: "Consina Order Payment",
              price: Math.round(Number(order.total_idr ?? 0)),
              quantity: 1,
            },
          ];

    const [firstName, ...rest] = (order.customer_name || "Customer").split(" ");

    const payload = {
      transaction_details: {
        order_id: order.id,
        gross_amount: order.total_idr,
      },
      item_details: itemDetails,
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
 * Public: returns the Midtrans client key + environment so the frontend
 * can load the correct snap.js and invoke snap.pay() inline.
 */
export const getMidtransConfig = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      assertMidtransKeys();
    } catch (err) {
      console.error("[midtrans] config invalid:", (err as Error).message);
    }
    return {
      clientKey: clientKey(),
      isProduction: isProduction(),
    };
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
