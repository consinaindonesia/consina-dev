import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight, ArrowLeft, Loader2 } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { StockEditor } from "@/components/admin/StockEditor";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/products/$id/stock")({
  head: () => ({ meta: [{ title: "Where available — Admin" }, { name: "robots", content: "noindex" }] }),
  component: ProductStockPage,
});

function ProductStockPage() {
  const { id } = Route.useParams();
  const [product, setProduct] = useState<{ name_en: string; sku: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase.from("products").select("name_en, sku").eq("id", id).maybeSingle();
      if (cancelled) return;
      setProduct(data as { name_en: string; sku: string } | null);
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
        <Link to="/admin/products" className="hover:text-foreground">Products</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Where available</span>
      </nav>

      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {loading ? "…" : `Where available — ${product?.name_en ?? "product"}`}
          </h1>
          {product?.sku && <p className="font-mono text-xs text-muted-foreground">{product.sku}</p>}
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/products/$id/edit" params={{ id }}>
              Edit product
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/products">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <StockEditor mode={{ kind: "byProduct", productId: id, productName: product?.name_en ?? "" }} />
      )}
    </AdminShell>
  );
}