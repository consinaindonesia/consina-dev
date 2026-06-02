import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight, ArrowLeft, Loader2 } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { StockEditor } from "@/components/admin/StockEditor";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/stores/$id/stock")({
  head: () => ({ meta: [{ title: "Store stock — Admin" }, { name: "robots", content: "noindex" }] }),
  component: StoreStockPage,
});

function StoreStockPage() {
  const { id } = Route.useParams();
  const [store, setStore] = useState<{ name: string; city: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase.from("stores").select("name, city").eq("id", id).maybeSingle();
      if (cancelled) return;
      setStore(data as { name: string; city: string | null } | null);
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <AdminShell>
      <nav className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link to="/admin" className="hover:text-foreground">Dashboard</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/admin/stores" className="hover:text-foreground">Stores</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Stock</span>
      </nav>

      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {loading ? "…" : `Stock at ${store?.name ?? "store"}`}
          </h1>
          {store?.city && <p className="text-sm text-muted-foreground">{store.city}</p>}
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/stores">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to stores
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <StockEditor mode={{ kind: "byStore", storeId: id, storeName: store?.name ?? "" }} />
      )}
    </AdminShell>
  );
}