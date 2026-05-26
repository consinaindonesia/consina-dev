import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2, CheckCircle2 } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { EmptyState } from "@/components/admin/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/restocks")({
  head: () => ({
    meta: [
      { title: "Restock alerts — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RestocksPage,
});

type Row = {
  id: string;
  email: string;
  notified_at: string | null;
  created_at: string;
  product: { id: string; sku: string; name_en: string; name_id: string; stock_status: string } | null;
};

function RestocksPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  async function load() {
    setLoading(true);
    let q = supabase
      .from("notify_when_in_stock")
      .select("id, email, notified_at, created_at, product:products(id, sku, name_en, name_id, stock_status)")
      .order("created_at", { ascending: false });
    if (filter === "pending") q = q.is("notified_at", null);
    const { data, error } = await q;
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((data ?? []) as unknown as Row[]);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function markNotified(id: string) {
    const { error } = await supabase
      .from("notify_when_in_stock")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Marked as notified");
    void load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this notification request?")) return;
    const { error } = await supabase.from("notify_when_in_stock").delete().eq("id", id);
    if (error) return toast.error(error.message);
    void load();
  }

  return (
    <AdminShell>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Restock alerts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Customers who asked to be notified when an out-of-stock product becomes available.
            When you change a product's stock back to <strong>in stock</strong>, its pending
            entries are flagged here as ready to email.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("pending")}
          >
            Pending
          </Button>
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon="Bell"
          title="No alerts"
          description="There are no restock notification requests matching this filter."
        />
      ) : (
        <div className="overflow-hidden rounded-md border border-border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Requested</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2.5">
                    {r.product ? (
                      <div>
                        <div className="font-medium">{r.product.name_en || r.product.name_id}</div>
                        <div className="text-xs text-muted-foreground">SKU: {r.product.sku}</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">(deleted)</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">{r.email}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5">
                    {r.notified_at ? (
                      <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700">
                        Notified {new Date(r.notified_at).toLocaleDateString()}
                      </Badge>
                    ) : r.product?.stock_status === "in_stock" ? (
                      <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700">
                        Ready to email
                      </Badge>
                    ) : (
                      <Badge variant="outline">Waiting for stock</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-2">
                      {!r.notified_at && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markNotified(r.id)}
                        >
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                          Mark notified
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(r.id)}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}