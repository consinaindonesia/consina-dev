import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const STRIPE_API = "https://api.stripe.com/v1";

function authHeader(): string {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  return "Bearer " + key;
}

function adminClient() {
  const url = process.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Supabase server config missing");
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function formEncode(params: Record<string, string | number | undefined>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) usp.append(k, String(v));
  }
  return usp.toString();
}

/**
 * Create a Stripe Checkout Session for the given order.
 * Returns the hosted Checkout URL the customer should be redirected to.
 * Pricing is in IDR (zero-decimal in Stripe: amount = order.total_idr).
 */
export const createStripeCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        orderId: z.string().uuid(),
        origin: z.string().url(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("Stripe is not configured");
    }
    const supabase = adminClient();
    const { data: order, error } = await supabase
      .from("orders")
      .select(
        "id, customer_name, customer_email, total_idr, payment_status, order_items(product_name, quantity, unit_price_idr)",
      )
      .eq("id", data.orderId)
      .maybeSingle();
    if (error || !order) throw new Error("Order not found");
    if (order.payment_status === "paid" || order.payment_status === "refunded") {
      throw new Error("Order already settled");
    }

    const successUrl = `${data.origin}/en/order/${order.id}?stripe=success`;
    const cancelUrl = `${data.origin}/en/order/${order.id}?stripe=cancel`;

    const body: Record<string, string | number | undefined> = {
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: order.customer_email,
      "metadata[order_id]": order.id,
      "payment_intent_data[metadata][order_id]": order.id,
    };

    const items = ((order.order_items ?? []) as Array<{
      product_name: string | null;
      quantity: number;
      unit_price_idr: number;
    }>);
    items.forEach((it, idx) => {
      body[`line_items[${idx}][price_data][currency]`] = "idr";
      body[`line_items[${idx}][price_data][unit_amount]`] = it.unit_price_idr;
      body[`line_items[${idx}][price_data][product_data][name]`] =
        (it.product_name || "Item").slice(0, 250);
      body[`line_items[${idx}][quantity]`] = it.quantity;
    });

    const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formEncode(body),
    });
    const json = (await res.json()) as {
      id?: string;
      url?: string;
      error?: { message?: string };
    };
    if (!res.ok || !json.url || !json.id) {
      console.error("Stripe session error", res.status, json);
      throw new Error(json.error?.message || `Stripe error (${res.status})`);
    }

    await supabase
      .from("orders")
      .update({
        payment_provider: "stripe",
        payment_method: "stripe",
        payment_reference: json.id,
        payment_status: "pending",
      })
      .eq("id", order.id);

    return { redirectUrl: json.url };
  });

/**
 * Refund a Stripe-paid order in full.
 */
export const refundStripeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        orderId: z.string().uuid(),
        reason: z.string().min(1).max(255).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Not authorized");

    const supabase = adminClient();
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, payment_status, payment_provider, payment_reference")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error || !order) throw new Error("Order not found");
    if (order.payment_provider !== "stripe") {
      throw new Error("Order was not paid via Stripe");
    }
    if (order.payment_status !== "paid") {
      throw new Error("Only paid orders can be refunded");
    }

    // payment_reference is set to the PaymentIntent id by the webhook on success.
    const pi = order.payment_reference;
    if (!pi || !pi.startsWith("pi_")) {
      throw new Error("Missing Stripe payment intent id on order");
    }

    const res = await fetch(`${STRIPE_API}/refunds`, {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formEncode({
        payment_intent: pi,
        reason: "requested_by_customer",
        "metadata[reason]": data.reason || "Refunded by admin",
      }),
    });
    const json = (await res.json()) as { error?: { message?: string } };
    if (!res.ok) {
      console.error("Stripe refund error", res.status, json);
      throw new Error(json.error?.message || `Refund failed (${res.status})`);
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