import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

/**
 * Midtrans payment notification webhook.
 * Verifies signature_key = SHA512(order_id + status_code + gross_amount + server_key)
 * and updates the order's payment_status. Idempotent via the
 * payment_events(transaction_id, transaction_status) unique index.
 */
export const Route = createFileRoute("/api/public/hooks/midtrans")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const serverKey = process.env.MIDTRANS_SERVER_KEY;
        if (!serverKey) {
          return new Response("Midtrans not configured", { status: 500 });
        }

        let payload: Record<string, unknown>;
        try {
          payload = (await request.json()) as Record<string, unknown>;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const orderId = String(payload.order_id ?? "");
        const statusCode = String(payload.status_code ?? "");
        const grossAmount = String(payload.gross_amount ?? "");
        const signatureKey = String(payload.signature_key ?? "");
        const transactionStatus = String(payload.transaction_status ?? "");
        const fraudStatus = String(payload.fraud_status ?? "");
        const transactionId = String(payload.transaction_id ?? "");

        if (!orderId || !signatureKey) {
          return new Response("Missing fields", { status: 400 });
        }

        const expected = createHash("sha512")
          .update(orderId + statusCode + grossAmount + serverKey)
          .digest("hex");
        if (expected !== signatureKey) {
          console.warn("midtrans webhook: bad signature for", orderId);
          return new Response("Invalid signature", { status: 401 });
        }

        const url =
          process.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !serviceKey) {
          return new Response("Server config missing", { status: 500 });
        }
        const supabase = createClient(url, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        // Idempotency: skip if we've already recorded this exact event.
        const { data: existing } = await supabase
          .from("payment_events")
          .select("id")
          .eq("transaction_id", transactionId)
          .eq("transaction_status", transactionStatus)
          .maybeSingle();

        if (!existing) {
          await supabase.from("payment_events").insert({
            order_id: orderId,
            provider: "midtrans",
            transaction_id: transactionId || null,
            transaction_status: transactionStatus || null,
            fraud_status: fraudStatus || null,
            signature_key: signatureKey,
            raw: payload,
          });
        }

        // Map Midtrans status -> our payment_status.
        let newPaymentStatus: string | null = null;
        let newOrderStatus: string | null = null;
        let paidAt: string | null = null;
        let refundedAt: string | null = null;

        if (
          transactionStatus === "capture" ||
          transactionStatus === "settlement"
        ) {
          if (fraudStatus === "challenge") {
            newPaymentStatus = "verifying";
          } else {
            newPaymentStatus = "paid";
            newOrderStatus = "preparing";
            paidAt = new Date().toISOString();
          }
        } else if (
          transactionStatus === "deny" ||
          transactionStatus === "cancel" ||
          transactionStatus === "expire"
        ) {
          newPaymentStatus = "failed";
          newOrderStatus = "cancelled";
        } else if (transactionStatus === "pending") {
          newPaymentStatus = "verifying";
        } else if (transactionStatus === "refund" || transactionStatus === "partial_refund") {
          newPaymentStatus = "refunded";
          newOrderStatus = "cancelled";
          refundedAt = new Date().toISOString();
        }

        if (newPaymentStatus) {
          // Load current state; don't overwrite "paid" with stale "pending" etc.
          const { data: order } = await supabase
            .from("orders")
            .select("payment_status")
            .eq("id", orderId)
            .maybeSingle();

          const cur = order?.payment_status;
          const isTerminal = cur === "paid" || cur === "refunded";
          // Allow paid -> refunded transition; block any other backward move.
          const allowed =
            !isTerminal ||
            (cur === "paid" && newPaymentStatus === "refunded");

          if (allowed) {
            const patch: Record<string, unknown> = {
              payment_status: newPaymentStatus,
              midtrans_transaction_status: transactionStatus,
            };
            if (newOrderStatus) patch.status = newOrderStatus;
            if (paidAt) patch.paid_at = paidAt;
            if (refundedAt) patch.refunded_at = refundedAt;
            await supabase.from("orders").update(patch).eq("id", orderId);

            // Idempotent stock decrement on first transition to paid.
            if (newPaymentStatus === "paid") {
              await decrementStockForOrder(supabase, orderId);
            }
          }
        }

        return Response.json({ ok: true });
      },
    },
  },
});

/**
 * Decrement stock for each order line. Idempotent: only the first call that
 * successfully claims orders.stock_decremented_at performs the decrement.
 * Decrements the size variant if present, else the color variant (if it
 * tracks stock), else the base product. Clamps at 0 — never goes negative.
 */
async function decrementStockForOrder(
  supabase: ReturnType<typeof createClient>,
  orderId: string,
) {
  // Claim the decrement slot atomically.
  const { data: claimed, error: claimErr } = await supabase
    .from("orders")
    .update({ stock_decremented_at: new Date().toISOString() })
    .eq("id", orderId)
    .is("stock_decremented_at", null)
    .select("id")
    .maybeSingle();
  if (claimErr || !claimed) return; // already decremented or update failed

  const { data: lines } = await supabase
    .from("order_items")
    .select("product_id, variant_id, size_variant_id, quantity")
    .eq("order_id", orderId);
  if (!lines) return;

  for (const line of lines) {
    const qty = Math.max(0, Number(line.quantity ?? 0));
    if (!qty) continue;

    try {
      if (line.size_variant_id) {
        const { data: sv } = await supabase
          .from("product_size_variants")
          .select("stock")
          .eq("id", line.size_variant_id)
          .maybeSingle();
        if (sv) {
          const next = Math.max(0, (sv.stock ?? 0) - qty);
          await supabase
            .from("product_size_variants")
            .update({ stock: next })
            .eq("id", line.size_variant_id);
        }
      } else if (line.variant_id) {
        const { data: cv } = await supabase
          .from("product_variants")
          .select("stock")
          .eq("id", line.variant_id)
          .maybeSingle();
        if (cv && cv.stock != null) {
          const next = Math.max(0, cv.stock - qty);
          await supabase
            .from("product_variants")
            .update({ stock: next })
            .eq("id", line.variant_id);
        } else if (line.product_id) {
          await decrementProductBaseStock(supabase, line.product_id, qty);
        }
      } else if (line.product_id) {
        await decrementProductBaseStock(supabase, line.product_id, qty);
      }
    } catch (err) {
      console.error("stock decrement failed for line", line, err);
    }
  }
}

async function decrementProductBaseStock(
  supabase: ReturnType<typeof createClient>,
  productId: string,
  qty: number,
) {
  const { data: p } = await supabase
    .from("products")
    .select("stock")
    .eq("id", productId)
    .maybeSingle();
  if (!p || p.stock == null) return;
  const next = Math.max(0, p.stock - qty);
  await supabase
    .from("products")
    .update({ stock: next })
    .eq("id", productId);
}