import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LangProvider";
import { formatPrice } from "@/i18n/format";

function useSearch(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const out: Record<string, string> = {};
  new URLSearchParams(window.location.search).forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

type InquiryRow = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_city: string | null;
};

type ItemRow = {
  id: string;
  quantity: number;
  notes: string | null;
  product: {
    id: string;
    sku: string;
    name_en: string;
    name_id: string;
    price_idr: number;
  } | null;
};

const SHIPPING_FLAT_IDR = 50_000;

export function CheckoutPage() {
  const lang = useLang();
  const navigate = useNavigate();
  const search = useSearch();
  const inquiryId = search.inquiry || "";

  const [loading, setLoading] = useState(true);
  const [inquiry, setInquiry] = useState<InquiryRow | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [shippingMethod, setShippingMethod] = useState<"pickup" | "delivery">("pickup");
  const [shippingAddress, setShippingAddress] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!inquiryId) {
        setLoading(false);
        return;
      }
      const { data: inq } = await supabase
        .from("inquiries")
        .select("id, customer_name, customer_email, customer_phone, customer_city")
        .eq("id", inquiryId)
        .maybeSingle();
      const { data: its } = await supabase
        .from("inquiry_items")
        .select("id, quantity, notes, product:products(id, sku, name_en, name_id, price_idr)")
        .eq("inquiry_id", inquiryId);
      if (cancelled) return;
      setInquiry(inq as InquiryRow | null);
      setItems((its as unknown as ItemRow[]) ?? []);
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [inquiryId]);

  const subtotal = useMemo(
    () =>
      items.reduce(
        (s, it) => s + (it.product?.price_idr ?? 0) * it.quantity,
        0,
      ),
    [items],
  );
  const shipping = shippingMethod === "delivery" ? SHIPPING_FLAT_IDR : 0;
  const total = subtotal + shipping;

  async function handleConfirm() {
    if (!inquiry) return;
    if (shippingMethod === "delivery" && shippingAddress.trim().length < 10) {
      toast.error("Please enter a delivery address");
      return;
    }
    setSubmitting(true);
    try {
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          inquiry_id: inquiry.id,
          customer_name: inquiry.customer_name,
          customer_email: inquiry.customer_email,
          customer_phone: inquiry.customer_phone ?? "",
          customer_address: customerAddress || null,
          shipping_method: shippingMethod,
          shipping_address: shippingMethod === "delivery" ? shippingAddress : null,
          subtotal_idr: subtotal,
          shipping_idr: shipping,
          total_idr: total,
          payment_method: "bank_transfer",
          payment_status: "pending",
          status: "new",
        })
        .select("id")
        .single();
      if (orderErr || !order) throw orderErr ?? new Error("Order failed");

      const rows = items
        .filter((it) => it.product)
        .map((it) => ({
          order_id: order.id,
          product_id: it.product!.id,
          product_name: lang === "id" ? it.product!.name_id : it.product!.name_en,
          sku: it.product!.sku,
          quantity: it.quantity,
          unit_price_idr: it.product!.price_idr,
          line_total_idr: it.product!.price_idr * it.quantity,
        }));
      if (rows.length) {
        const { error: itErr } = await supabase.from("order_items").insert(rows);
        if (itErr) throw itErr;
      }

      const path = lang === "id" ? `/id/order/${order.id}` : `/en/order/${order.id}`;
      navigate({ to: path as never });
    } catch (err) {
      console.error(err);
      toast.error("Could not create order");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex max-w-3xl items-center justify-center px-4 py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!inquiry) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Inquiry not found</h1>
        <p className="mt-2 text-muted-foreground">
          The inquiry reference is invalid or has expired.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <h1 className="font-[Archivo] text-3xl font-bold tracking-tight sm:text-4xl">
        Checkout
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Review your items and confirm your order.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[3fr_2fr]">
        <section className="space-y-8">
          <div className="rounded-lg border border-border">
            <div className="border-b border-border px-4 py-3 text-sm font-semibold">
              Items
            </div>
            <ul className="divide-y divide-border">
              {items.map((it) => {
                const name = it.product
                  ? lang === "id"
                    ? it.product.name_id
                    : it.product.name_en
                  : "—";
                return (
                  <li key={it.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-sm font-medium">{name}</p>
                      <p className="text-xs text-muted-foreground">
                        {it.product?.sku} · ×{it.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">
                      {formatPrice((it.product?.price_idr ?? 0) * it.quantity, lang)}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-lg border border-border p-4">
            <h2 className="text-sm font-semibold">Shipping</h2>
            <RadioGroup
              value={shippingMethod}
              onValueChange={(v) => setShippingMethod(v as "pickup" | "delivery")}
              className="mt-3 space-y-3"
            >
              <label className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer">
                <RadioGroupItem value="pickup" id="pickup" className="mt-1" />
                <div>
                  <div className="text-sm font-medium">Pickup at store</div>
                  <div className="text-xs text-muted-foreground">
                    Free — collect at any Consina store
                  </div>
                </div>
              </label>
              <label className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer">
                <RadioGroupItem value="delivery" id="delivery" className="mt-1" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Home delivery</div>
                  <div className="text-xs text-muted-foreground">
                    Flat fee {formatPrice(SHIPPING_FLAT_IDR, lang)}
                  </div>
                  {shippingMethod === "delivery" && (
                    <div className="mt-3 space-y-2">
                      <Label className="text-xs">Delivery address</Label>
                      <Textarea
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        rows={3}
                        placeholder="Street, city, postal code"
                      />
                    </div>
                  )}
                </div>
              </label>
            </RadioGroup>
          </div>

          <div className="rounded-lg border border-border p-4">
            <h2 className="text-sm font-semibold">Payment method</h2>
            <RadioGroup value="bank_transfer" className="mt-3 space-y-2">
              <label className="flex items-center gap-3 rounded-md border border-border p-3 cursor-pointer">
                <RadioGroupItem value="bank_transfer" id="bt" />
                <span className="text-sm font-medium">Bank Transfer</span>
              </label>
              <div className="flex items-center gap-3 rounded-md border border-border p-3 opacity-50">
                <RadioGroupItem value="midtrans" id="mt" disabled />
                <span className="text-sm">Midtrans (coming soon)</span>
              </div>
              <div className="flex items-center gap-3 rounded-md border border-border p-3 opacity-50">
                <RadioGroupItem value="stripe" id="st" disabled />
                <span className="text-sm">Stripe (coming soon)</span>
              </div>
            </RadioGroup>
          </div>

          <div className="rounded-lg border border-border p-4">
            <h2 className="text-sm font-semibold">Customer</h2>
            <p className="mt-2 text-sm">{inquiry.customer_name}</p>
            <p className="text-xs text-muted-foreground">
              {inquiry.customer_email} · {inquiry.customer_phone}
            </p>
            <div className="mt-3">
              <Label className="text-xs">Billing address (optional)</Label>
              <Input
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                maxLength={255}
              />
            </div>
          </div>
        </section>

        <aside>
          <div className="sticky top-6 rounded-lg border border-border bg-card p-5">
            <h2 className="font-[Archivo] text-lg font-bold">Order summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{formatPrice(subtotal, lang)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Shipping</dt>
                <dd>{shipping === 0 ? "Free" : formatPrice(shipping, lang)}</dd>
              </div>
              <div className="mt-2 flex justify-between border-t border-border pt-3 text-base font-bold">
                <dt>Total</dt>
                <dd>{formatPrice(total, lang)}</dd>
              </div>
            </dl>
            <Button
              size="lg"
              className="mt-5 w-full"
              onClick={handleConfirm}
              disabled={submitting || items.length === 0}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm order
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              You'll see bank transfer instructions on the next page.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}