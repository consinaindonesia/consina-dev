import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, ExternalLink, Loader2, XCircle } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/orders/$id")({
  head: () => ({
    meta: [
      { title: "Order — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderDetailPage,
});

type Order = {
  id: string;
  inquiry_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string | null;
  shipping_method: string;
  shipping_address: string | null;
  subtotal_idr: number;
  shipping_idr: number;
  total_idr: number;
  payment_method: string;
  payment_status: string;
  payment_reference: string | null;
  payment_proof_url: string | null;
  status: string;
  notes: string | null;
  created_at: string;
};

type Item = {
  id: string;
  product_name: string | null;
  sku: string | null;
  quantity: number;
  unit_price_idr: number;
  line_total_idr: number;
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  awaiting_proof: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  verifying: "bg-purple-500/10 text-purple-700 border-purple-500/30",
  paid: "bg-green-500/10 text-green-700 border-green-500/30",
  failed: "bg-destructive/10 text-destructive border-destructive/30",
  refunded: "bg-muted text-muted-foreground border-border",
};

function shortRef(id: string): string {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function OrderDetailPage() {
  const { id } = Route.useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [{ data: o }, { data: its }] = await Promise.all([
        supabase.from("orders").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("order_items")
          .select("id, product_name, sku, quantity, unit_price_idr, line_total_idr")
          .eq("order_id", id),
      ]);
      if (cancelled) return;
      setOrder(o as Order | null);
      setItems((its as Item[]) ?? []);
      setNotes((o as Order | null)?.notes ?? "");
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function setPaymentStatus(payment_status: string, status?: string) {
    if (!order) return;
    setSaving(true);
    const patch: { payment_status: string; status?: string } = { payment_status };
    if (status) patch.status = status;
    const { error } = await supabase.from("orders").update(patch).eq("id", order.id);
    if (error) {
      toast.error(error.message);
    } else {
      setOrder({ ...order, payment_status, status: status ?? order.status });
      toast.success("Updated");
    }
    setSaving(false);
  }

  async function saveNotes() {
    if (!order) return;
    setSaving(true);
    const { error } = await supabase
      .from("orders")
      .update({ notes })
      .eq("id", order.id);
    if (error) toast.error(error.message);
    else toast.success("Notes saved");
    setSaving(false);
  }

  if (loading) {
    return (
      <AdminShell>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminShell>
    );
  }

  if (!order) {
    return (
      <AdminShell>
        <div className="px-8 py-12">Order not found.</div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="px-4 py-6 sm:px-8">
        <Link
          to="/admin/orders"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to orders
        </Link>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Order</p>
            <h1 className="font-mono text-2xl font-bold">{shortRef(order.id)}</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(order.created_at).toLocaleString()}
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn("border", STATUS_COLOR[order.payment_status])}
          >
            {order.payment_status}
          </Badge>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card">
              <div className="border-b border-border px-4 py-3 text-sm font-semibold">
                Items
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border">
                  {items.map((it) => (
                    <tr key={it.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{it.product_name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {it.sku} · ×{it.quantity}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        Rp {it.line_total_idr.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-border bg-muted/30 text-sm">
                  <tr>
                    <td className="px-4 py-2 text-muted-foreground">Subtotal</td>
                    <td className="px-4 py-2 text-right">
                      Rp {order.subtotal_idr.toLocaleString("id-ID")}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-muted-foreground">Shipping</td>
                    <td className="px-4 py-2 text-right">
                      Rp {order.shipping_idr.toLocaleString("id-ID")}
                    </td>
                  </tr>
                  <tr className="font-bold">
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-right">
                      Rp {order.total_idr.toLocaleString("id-ID")}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Payment proof</h2>
              {order.payment_proof_url ? (
                <div className="mt-3 space-y-3">
                  <a
                    href={order.payment_proof_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block max-w-md overflow-hidden rounded-md border border-border"
                  >
                    {order.payment_proof_url.match(/\.(pdf)$/i) ? (
                      <div className="flex items-center gap-2 p-4 text-sm text-primary">
                        <ExternalLink className="h-4 w-4" /> Open PDF
                      </div>
                    ) : (
                      <img
                        src={order.payment_proof_url}
                        alt="Payment proof"
                        className="max-h-96 w-full object-contain"
                      />
                    )}
                  </a>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => setPaymentStatus("paid", "preparing")}
                      disabled={saving || order.payment_status === "paid"}
                    >
                      <CheckCircle2 className="mr-1.5 h-4 w-4" />
                      Confirm payment
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setPaymentStatus("verifying")}
                      disabled={saving}
                    >
                      Mark verifying
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setPaymentStatus("failed", "cancelled")}
                      disabled={saving}
                    >
                      <XCircle className="mr-1.5 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Customer hasn't uploaded payment proof yet.
                </p>
              )}
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <Label className="text-sm font-semibold">Internal notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="mt-2"
              />
              <Button
                size="sm"
                onClick={saveNotes}
                disabled={saving}
                className="mt-3"
              >
                Save notes
              </Button>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Customer</h2>
              <p className="mt-2 text-sm">{order.customer_name}</p>
              <p className="text-xs text-muted-foreground">
                {order.customer_email}
              </p>
              <p className="text-xs text-muted-foreground">
                {order.customer_phone}
              </p>
              {order.customer_address && (
                <p className="mt-2 text-xs">{order.customer_address}</p>
              )}
              {order.inquiry_id && (
                <Link
                  to={`/admin/inquiries/${order.inquiry_id}` as never}
                  className="mt-3 inline-block text-xs text-primary underline-offset-4 hover:underline"
                >
                  View originating inquiry →
                </Link>
              )}
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Shipping</h2>
              <p className="mt-2 text-sm capitalize">{order.shipping_method}</p>
              {order.shipping_address && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {order.shipping_address}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Order status</h2>
              <p className="mt-2 text-sm capitalize">{order.status}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["preparing", "shipped", "delivered", "cancelled"].map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={order.status === s ? "default" : "outline"}
                    onClick={() => setPaymentStatus(order.payment_status, s)}
                    disabled={saving}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AdminShell>
  );
}