import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Stripe webhook endpoint.
 * Verifies the t=.../v1=... signature against STRIPE_WEBHOOK_SECRET,
 * then maps event type -> order payment_status. Idempotent via
 * payment_events(transaction_id, transaction_status).
 */
export const Route = createFileRoute("/api/public/hooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret) return new Response("Stripe not configured", { status: 500 });

        const sigHeader = request.headers.get("stripe-signature") || "";
        const rawBody = await request.text();

        // Parse "t=...,v1=...,v1=..."
        const parts = sigHeader.split(",").map((p) => p.split("="));
        const t = parts.find((p) => p[0] === "t")?.[1];
        const v1s = parts.filter((p) => p[0] === "v1").map((p) => p[1]);
        if (!t || v1s.length === 0) {
          return new Response("Invalid signature header", { status: 400 });
        }
        const expected = createHmac("sha256", secret)
          .update(`${t}.${rawBody}`)
          .digest("hex");
        const expectedBuf = Buffer.from(expected);
        const ok = v1s.some((v) => {
          const vb = Buffer.from(v);
          return vb.length === expectedBuf.length && timingSafeEqual(vb, expectedBuf);
        });
        if (!ok) return new Response("Invalid signature", { status: 401 });

        let event: {
          id?: string;
          type?: string;
          data?: { object?: Record<string, unknown> };
        };
        try {
          event = JSON.parse(rawBody);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const url = process.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !serviceKey) {
          return new Response("Server config missing", { status: 500 });
        }
        const supabase = createClient(url, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const obj = (event.data?.object ?? {}) as Record<string, unknown>;
        const metadata = (obj.metadata as Record<string, string> | undefined) ?? {};
        const orderId =
          metadata.order_id ||
          ((obj.payment_intent as Record<string, unknown> | undefined)?.metadata as
            | Record<string, string>
            | undefined)?.order_id ||
          "";
        const transactionId = String(obj.id ?? event.id ?? "");
        const transactionStatus = String(event.type ?? "");

        if (!orderId) {
          return Response.json({ ok: true, skipped: "no order_id" });
        }

        // Idempotency
        const { data: existing } = await supabase
          .from("payment_events")
          .select("id")
          .eq("transaction_id", transactionId)
          .eq("transaction_status", transactionStatus)
          .maybeSingle();
        if (!existing) {
          await supabase.from("payment_events").insert({
            order_id: orderId,
            provider: "stripe",
            transaction_id: transactionId,
            transaction_status: transactionStatus,
            raw: event as unknown as Record<string, unknown>,
          });
        }

        let newPaymentStatus: string | null = null;
        let newOrderStatus: string | null = null;
        let paidAt: string | null = null;
        let refundedAt: string | null = null;
        let paymentIntentId: string | null = null;

        switch (event.type) {
          case "checkout.session.completed":
          case "checkout.session.async_payment_succeeded": {
            const paymentStatus = String(obj.payment_status ?? "");
            paymentIntentId = String(obj.payment_intent ?? "") || null;
            if (paymentStatus === "paid") {
              newPaymentStatus = "paid";
              newOrderStatus = "preparing";
              paidAt = new Date().toISOString();
            } else {
              newPaymentStatus = "verifying";
            }
            break;
          }
          case "checkout.session.async_payment_failed":
          case "checkout.session.expired": {
            newPaymentStatus = "failed";
            newOrderStatus = "cancelled";
            break;
          }
          case "charge.refunded":
          case "refund.created":
          case "refund.updated": {
            newPaymentStatus = "refunded";
            newOrderStatus = "cancelled";
            refundedAt = new Date().toISOString();
            break;
          }
          default:
            return Response.json({ ok: true, ignored: event.type });
        }

        const { data: current } = await supabase
          .from("orders")
          .select("payment_status")
          .eq("id", orderId)
          .maybeSingle();
        const cur = current?.payment_status;
        const isTerminal = cur === "paid" || cur === "refunded";
        const allowed =
          !isTerminal || (cur === "paid" && newPaymentStatus === "refunded");
        if (!allowed) return Response.json({ ok: true, skipped: "terminal" });

        const patch: Record<string, unknown> = {
          payment_status: newPaymentStatus,
        };
        if (newOrderStatus) patch.status = newOrderStatus;
        if (paidAt) patch.paid_at = paidAt;
        if (refundedAt) patch.refunded_at = refundedAt;
        if (paymentIntentId) patch.payment_reference = paymentIntentId;
        await supabase.from("orders").update(patch).eq("id", orderId);

        return Response.json({ ok: true });
      },
    },
  },
});