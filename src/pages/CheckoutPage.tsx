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
import {
  fetchShippingOptions,
  pickZone,
  quoteShipping,
  type ShippingMethod as ShipMethod,
  type ShippingZone,
} from "@/lib/shipping";
import { useServerFn } from "@tanstack/react-start";
import { getBiteshipRates, type BiteshipRate } from "@/lib/biteship.functions";
import { validateVoucher, redeemVoucher } from "@/lib/voucher.functions";
import { useCart, clearCart } from "@/lib/cart-store";

type PaymentMethod = "bank_transfer" | "midtrans" | "stripe";

function detectIsIndonesian(): boolean {
  if (typeof navigator === "undefined") return true;
  const langs = [navigator.language, ...(navigator.languages ?? [])]
    .filter(Boolean)
    .map((l) => l.toLowerCase());
  return langs.some((l) => l.startsWith("id"));
}

async function fetchUsdRate(): Promise<number | null> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    const json = (await res.json()) as { rates?: { IDR?: number } };
    return json.rates?.IDR ?? null;
  } catch {
    return null;
  }
}

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
    weight_grams: number | null;
  } | null;
};

export function CheckoutPage() {
  const lang = useLang();
  const navigate = useNavigate();
  const search = useSearch();
  const inquiryId = search.inquiry || "";
  const isCart = search.cart === "1";
  const cart = useCart();

  const [loading, setLoading] = useState(true);
  const [inquiry, setInquiry] = useState<InquiryRow | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [shippingMethod, setShippingMethod] = useState<"pickup" | "delivery">("pickup");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingPostal, setShippingPostal] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const isIndonesian = useMemo(detectIsIndonesian, []);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    isIndonesian ? "midtrans" : "stripe",
  );
  const [submitting, setSubmitting] = useState(false);
  const [usdPerIdr, setUsdPerIdr] = useState<number | null>(null);
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [methods, setMethods] = useState<ShipMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string>("");

  // Guest contact (cart mode)
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  // Biteship live rates
  const [biteshipRates, setBiteshipRates] = useState<BiteshipRate[]>([]);
  const [biteshipLoading, setBiteshipLoading] = useState(false);
  const [biteshipError, setBiteshipError] = useState<string | null>(null);
  const [selectedBiteshipKey, setSelectedBiteshipKey] = useState<string>("");
  const fetchBiteship = useServerFn(getBiteshipRates);

  // Voucher
  const [voucherInput, setVoucherInput] = useState("");
  const [voucherApplying, setVoucherApplying] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    discount_idr: number;
  } | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const callValidateVoucher = useServerFn(validateVoucher);
  const callRedeemVoucher = useServerFn(redeemVoucher);

  useEffect(() => {
    if (isIndonesian) return;
    let cancelled = false;
    void fetchUsdRate().then((r) => {
      if (!cancelled && r) setUsdPerIdr(r);
    });
    return () => {
      cancelled = true;
    };
  }, [isIndonesian]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (isCart) {
        // Cart mode — items come from localStorage cart; no inquiry record.
        setLoading(false);
        return;
      }
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
        .select("id, quantity, notes, product:products(id, sku, name_en, name_id, price_idr, weight_grams)")
        .eq("inquiry_id", inquiryId);
      if (cancelled) return;
      setInquiry(inq as InquiryRow | null);
      setItems((its as unknown as ItemRow[]) ?? []);
      if (inq?.customer_city) setShippingCity(inq.customer_city);
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [inquiryId, isCart]);

  useEffect(() => {
    let cancelled = false;
    void fetchShippingOptions().then((opts) => {
      if (cancelled) return;
      setZones(opts.zones);
      setMethods(opts.methods);
      if (opts.methods[0]) setSelectedMethodId(opts.methods[0].id);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Unified item shape (works for both inquiry-loaded and cart items).
  const cartLineItems = useMemo(() => {
    if (isCart) {
      return cart.items.map((c) => ({
        id: c.key,
        productId: c.productId,
        sku: c.sku,
        name_id: c.name_id,
        name_en: c.name_en,
        price_idr: c.price_idr,
        weight_grams: c.weight_grams ?? 500,
        quantity: c.quantity,
      }));
    }
    return items
      .filter((it) => it.product)
      .map((it) => ({
        id: it.id,
        productId: it.product!.id,
        sku: it.product!.sku,
        name_id: it.product!.name_id,
        name_en: it.product!.name_en,
        price_idr: it.product!.price_idr,
        weight_grams: it.product!.weight_grams ?? 500,
        quantity: it.quantity,
      }));
  }, [isCart, cart.items, items]);

  const subtotal = useMemo(
    () =>
      cartLineItems.reduce((s, it) => s + it.price_idr * it.quantity, 0),
    [cartLineItems],
  );

  const totalWeightGrams = useMemo(
    () =>
      cartLineItems.reduce(
        (s, it) => s + (it.weight_grams || 500) * it.quantity,
        0,
      ),
    [cartLineItems],
  );

  const matchedZone = useMemo(
    () => (zones.length ? pickZone(zones, shippingCity) : null),
    [zones, shippingCity],
  );

  const quotes = useMemo(() => {
    if (!matchedZone) return [];
    return methods.map((m) => quoteShipping(matchedZone, m, totalWeightGrams));
  }, [matchedZone, methods, totalWeightGrams]);

  const selectedQuote = useMemo(
    () => quotes.find((q) => q.method.id === selectedMethodId) ?? null,
    [quotes, selectedMethodId],
  );

  const shipping =
    shippingMethod === "delivery"
      ? selectedBiteshipKey
        ? biteshipRates.find(
            (r) => `${r.courier_code}:${r.courier_service_code}` === selectedBiteshipKey,
          )?.price ?? 0
        : selectedQuote?.cost_idr ?? 0
      : 0;
  const discount = appliedVoucher?.discount_idr ?? 0;
  const total = Math.max(0, subtotal + shipping - discount);

  // Auto-fetch Biteship rates when city/postal entered.
  useEffect(() => {
    if (shippingMethod !== "delivery") return;
    if (cartLineItems.length === 0) return;
    if (!shippingPostal.trim() && !shippingCity.trim()) return;
    let cancelled = false;
    setBiteshipLoading(true);
    setBiteshipError(null);
    const itemsPayload = cartLineItems.map((it) => ({
      name: lang === "id" ? it.name_id : it.name_en,
      quantity: it.quantity,
      weight: it.weight_grams || 500,
      value: it.price_idr,
    }));
    fetchBiteship({
      data: {
        destination_postal_code: shippingPostal.trim() || undefined,
        destination_city: shippingCity.trim() || undefined,
        items: itemsPayload,
      },
    })
      .then((r) => {
        if (cancelled) return;
        setBiteshipRates(r.rates);
        if (r.error) setBiteshipError(r.error);
        if (r.rates[0]) {
          setSelectedBiteshipKey(
            `${r.rates[0].courier_code}:${r.rates[0].courier_service_code}`,
          );
        }
      })
      .catch((err) => {
        if (!cancelled) setBiteshipError((err as Error).message);
      })
      .finally(() => {
        if (!cancelled) setBiteshipLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shippingMethod, shippingPostal, shippingCity, subtotal, totalWeightGrams]);

  async function applyVoucherCode() {
    if (!voucherInput.trim()) return;
    setVoucherApplying(true);
    setVoucherError(null);
    try {
      const res = await callValidateVoucher({
        data: { code: voucherInput.trim(), subtotal_idr: subtotal },
      });
      if (!res.ok) {
        setVoucherError(res.error ?? "Invalid voucher");
        setAppliedVoucher(null);
      } else {
        setAppliedVoucher({ code: res.code!, discount_idr: res.discount_idr! });
        toast.success(`Voucher ${res.code} diterapkan`);
      }
    } catch (err) {
      setVoucherError((err as Error).message);
    } finally {
      setVoucherApplying(false);
    }
  }

  async function handleConfirm() {
    if (!isCart && !inquiry) return;
    if (cartLineItems.length === 0) {
      toast.error("Keranjang kosong");
      return;
    }
    if (isCart) {
      if (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim()) {
        toast.error("Mohon isi nama, email, dan nomor telepon");
        return;
      }
    }
    if (shippingMethod === "delivery") {
      if (shippingAddress.trim().length < 10) {
        toast.error("Please enter a delivery address");
        return;
      }
      if (!shippingCity.trim()) {
        toast.error("Please enter a city");
        return;
      }
      if (!selectedBiteshipKey && !selectedQuote) {
        toast.error("Please choose a shipping method");
        return;
      }
    }
    setSubmitting(true);
    try {
      const selectedBiteship = biteshipRates.find(
        (r) => `${r.courier_code}:${r.courier_service_code}` === selectedBiteshipKey,
      );
      const shippingMethodName =
        shippingMethod === "delivery"
          ? selectedBiteship
            ? `${selectedBiteship.courier_name} — ${selectedBiteship.courier_service_name}`
            : selectedQuote?.method.name ?? null
          : null;

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          inquiry_id: isCart ? null : inquiry!.id,
          customer_name: isCart ? guestName.trim() : inquiry!.customer_name,
          customer_email: isCart ? guestEmail.trim() : inquiry!.customer_email,
          customer_phone: isCart
            ? guestPhone.trim()
            : (inquiry!.customer_phone ?? ""),
          customer_address: customerAddress || null,
          shipping_method: shippingMethod,
          shipping_address: shippingMethod === "delivery" ? shippingAddress : null,
          shipping_city: shippingMethod === "delivery" ? shippingCity || null : null,
          shipping_postal_code:
            shippingMethod === "delivery" ? shippingPostal || null : null,
          shipping_method_id:
            shippingMethod === "delivery" && !selectedBiteship
              ? selectedQuote?.method.id ?? null
              : null,
          shipping_method_name:
            shippingMethod === "delivery" ? shippingMethodName : null,
          shipping_zone_id:
            shippingMethod === "delivery" && !selectedBiteship
              ? selectedQuote?.zone.id ?? null
              : null,
          subtotal_idr: subtotal,
          shipping_idr: shipping,
          voucher_code: appliedVoucher?.code ?? null,
          voucher_discount_idr: discount,
          total_idr: total,
          payment_method: paymentMethod,
          payment_provider: paymentMethod,
          payment_status: "pending",
          status: "new",
          notes: orderNotes || null,
        })
        .select("id")
        .single();
      if (orderErr || !order) throw orderErr ?? new Error("Order failed");

      const rows = cartLineItems.map((it) => ({
        order_id: order.id,
        product_id: it.productId,
        product_name: lang === "id" ? it.name_id : it.name_en,
        sku: it.sku,
        quantity: it.quantity,
        unit_price_idr: it.price_idr,
        line_total_idr: it.price_idr * it.quantity,
      }));
      if (rows.length) {
        const { error: itErr } = await supabase.from("order_items").insert(rows);
        if (itErr) throw itErr;
      }

      if (appliedVoucher) {
        // Best-effort; ignore failure
        void callRedeemVoucher({ data: { code: appliedVoucher.code } });
      }
      if (isCart) clearCart();

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
                    Calculated from your city and order weight (
                    {(totalWeightGrams / 1000).toFixed(1)} kg)
                  </div>
                  {shippingMethod === "delivery" && (
                    <div className="mt-3 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">City</Label>
                          <Input
                            value={shippingCity}
                            onChange={(e) => setShippingCity(e.target.value)}
                            placeholder="Jakarta"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Postal code</Label>
                          <Input
                            value={shippingPostal}
                            onChange={(e) => setShippingPostal(e.target.value)}
                            placeholder="12345"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Street address</Label>
                        <Textarea
                          value={shippingAddress}
                          onChange={(e) => setShippingAddress(e.target.value)}
                          rows={2}
                          placeholder="Street, building, unit"
                        />
                      </div>

                      {matchedZone && (
                        <div className="rounded-md border border-border p-3">
                          <p className="text-xs text-muted-foreground">
                            Shipping to <strong>{matchedZone.region_name}</strong>{" "}
                            zone
                          </p>
                          <RadioGroup
                            value={selectedMethodId}
                            onValueChange={setSelectedMethodId}
                            className="mt-2 space-y-2"
                          >
                            {quotes.map((q) => (
                              <label
                                key={q.method.id}
                                className="flex items-center justify-between gap-3 rounded-md border border-border p-2 cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <RadioGroupItem value={q.method.id} id={q.method.id} />
                                  <div>
                                    <div className="text-sm font-medium">
                                      {q.method.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {q.delivery_days_min}–{q.delivery_days_max} days
                                    </div>
                                  </div>
                                </div>
                                <div className="text-sm font-semibold">
                                  {formatPrice(q.cost_idr, lang)}
                                </div>
                              </label>
                            ))}
                          </RadioGroup>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </label>
            </RadioGroup>
          </div>

          <div className="rounded-lg border border-border p-4">
            <h2 className="text-sm font-semibold">Payment method</h2>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
              className="mt-3 space-y-2"
            >
              {(isIndonesian
                ? (["midtrans", "bank_transfer", "stripe"] as const)
                : (["stripe", "midtrans", "bank_transfer"] as const)
              ).map((method) => {
                const meta = {
                  bank_transfer: {
                    title: "Manual Bank Transfer",
                    desc: "Transfer to our bank account and upload proof",
                  },
                  midtrans: {
                    title: "Midtrans",
                    desc: "QRIS, GoPay, OVO, Dana, ShopeePay, credit card, or bank transfer",
                  },
                  stripe: {
                    title: isIndonesian
                      ? "Stripe (international cards)"
                      : "Stripe — recommended for international cards",
                    desc: "Pay with Visa, Mastercard, Amex. Charged in IDR.",
                  },
                }[method];
                return (
                  <label
                    key={method}
                    className="flex items-center gap-3 rounded-md border border-border p-3 cursor-pointer"
                  >
                    <RadioGroupItem value={method} id={method} />
                    <div>
                      <div className="text-sm font-medium">{meta.title}</div>
                      <div className="text-xs text-muted-foreground">{meta.desc}</div>
                    </div>
                  </label>
                );
              })}
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
                <dd className="text-right">
                  <div>{formatPrice(total, lang)}</div>
                  {usdPerIdr && (
                    <div className="text-xs font-normal text-muted-foreground">
                      ≈ ${(total / usdPerIdr).toFixed(2)} USD
                    </div>
                  )}
                </dd>
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