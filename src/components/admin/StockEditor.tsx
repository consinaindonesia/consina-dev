import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2, Search, Upload, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Mode =
  | { kind: "byStore"; storeId: string; storeName: string }
  | { kind: "byProduct"; productId: string; productName: string };

type StockRow = {
  id: string;
  store_id: string;
  product_id: string;
  stock_quantity: number | null;
  last_updated_at: string;
  label: string; // store name OR product name depending on mode
  sublabel?: string | null;
};

type Candidate = { id: string; label: string; sublabel?: string | null };

export function StockEditor(props: { mode: Mode }) {
  const { mode } = props;
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [searching, setSearching] = useState(false);

  async function load() {
    setLoading(true);
    if (mode.kind === "byStore") {
      const { data } = await supabase
        .from("store_stock")
        .select("id, store_id, product_id, stock_quantity, last_updated_at, products!inner(name_en, sku, is_active)")
        .eq("store_id", mode.storeId)
        .order("last_updated_at", { ascending: false });
      setRows(
        ((data ?? []) as any[]).map((r) => ({
          id: r.id,
          store_id: r.store_id,
          product_id: r.product_id,
          stock_quantity: r.stock_quantity,
          last_updated_at: r.last_updated_at,
          label: r.products?.name_en ?? "—",
          sublabel: r.products?.sku ?? null,
        })),
      );
    } else {
      const { data } = await supabase
        .from("store_stock")
        .select("id, store_id, product_id, stock_quantity, last_updated_at, stores!inner(name, city, is_active)")
        .eq("product_id", mode.productId)
        .order("last_updated_at", { ascending: false });
      setRows(
        ((data ?? []) as any[]).map((r) => ({
          id: r.id,
          store_id: r.store_id,
          product_id: r.product_id,
          stock_quantity: r.stock_quantity,
          last_updated_at: r.last_updated_at,
          label: r.stores?.name ?? "—",
          sublabel: r.stores?.city ?? null,
        })),
      );
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode.kind, "storeId" in mode ? mode.storeId : mode.productId]);

  async function runSearch(q: string) {
    setSearch(q);
    if (q.trim().length < 2) {
      setCandidates([]);
      return;
    }
    setSearching(true);
    const existingIds = new Set(rows.map((r) => (mode.kind === "byStore" ? r.product_id : r.store_id)));
    if (mode.kind === "byStore") {
      const { data } = await supabase
        .from("products")
        .select("id, name_en, sku")
        .eq("is_active", true)
        .or(`name_en.ilike.%${q}%,sku.ilike.%${q}%`)
        .limit(8);
      setCandidates(
        ((data ?? []) as any[])
          .filter((p) => !existingIds.has(p.id))
          .map((p) => ({ id: p.id, label: p.name_en, sublabel: p.sku })),
      );
    } else {
      const { data } = await supabase
        .from("stores")
        .select("id, name, city")
        .eq("is_active", true)
        .or(`name.ilike.%${q}%,city.ilike.%${q}%`)
        .limit(8);
      setCandidates(
        ((data ?? []) as any[])
          .filter((s) => !existingIds.has(s.id))
          .map((s) => ({ id: s.id, label: s.name, sublabel: s.city })),
      );
    }
    setSearching(false);
  }

  async function addRow(candidateId: string) {
    const payload =
      mode.kind === "byStore"
        ? { store_id: mode.storeId, product_id: candidateId, stock_quantity: null }
        : { store_id: candidateId, product_id: mode.productId, stock_quantity: null };
    const { error } = await supabase.from("store_stock").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Added");
    setSearch("");
    setCandidates([]);
    void load();
  }

  async function updateQty(id: string, raw: string) {
    const trimmed = raw.trim();
    const qty = trimmed === "" ? null : Math.max(0, Math.floor(Number(trimmed)));
    if (trimmed !== "" && !Number.isFinite(qty as number)) return;
    setRows((p) => p.map((r) => (r.id === id ? { ...r, stock_quantity: qty } : r)));
    const { error } = await supabase
      .from("store_stock")
      .update({ stock_quantity: qty, last_updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error(error.message);
  }

  async function removeRow(id: string) {
    const { error } = await supabase.from("store_stock").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((p) => p.filter((r) => r.id !== id));
    toast.success("Removed");
  }

  const csvTemplate = useMemo(() => {
    if (mode.kind === "byStore") return "product_sku,stock_quantity\nEXAMPLE-001,12\n";
    return "store_name,stock_quantity\nConsina Jakarta,12\n";
  }, [mode.kind]);

  function downloadTemplate() {
    const blob = new Blob([csvTemplate], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = mode.kind === "byStore" ? "store-stock-template.csv" : "product-availability-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importCsv(file: File) {
    const text = await file.text();
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      toast.error("CSV is empty");
      return;
    }
    const [, ...dataLines] = lines;
    let updated = 0;
    let failed = 0;
    for (const line of dataLines) {
      const [key, qtyRaw] = line.split(",").map((s) => s.trim());
      if (!key) continue;
      const qty = qtyRaw === "" || qtyRaw === undefined ? null : Math.max(0, Math.floor(Number(qtyRaw)));
      let otherId: string | null = null;
      if (mode.kind === "byStore") {
        const { data } = await supabase.from("products").select("id").ilike("sku", key).maybeSingle();
        otherId = data?.id ?? null;
      } else {
        const { data } = await supabase.from("stores").select("id").ilike("name", key).maybeSingle();
        otherId = data?.id ?? null;
      }
      if (!otherId) {
        failed++;
        continue;
      }
      const payload =
        mode.kind === "byStore"
          ? { store_id: mode.storeId, product_id: otherId, stock_quantity: qty, last_updated_at: new Date().toISOString() }
          : { store_id: otherId, product_id: mode.productId, stock_quantity: qty, last_updated_at: new Date().toISOString() };
      const { error } = await supabase.from("store_stock").upsert(payload, {
        onConflict: "store_id,product_id",
      });
      if (error) failed++;
      else updated++;
    }
    toast.success(`Imported ${updated} rows${failed ? ` (${failed} failed)` : ""}`);
    void load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[260px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => void runSearch(e.target.value)}
            placeholder={mode.kind === "byStore" ? "Search products to add..." : "Search stores to add..."}
            className="pl-8"
          />
          {candidates.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-md border border-border bg-popover shadow-md">
              {candidates.map((c) => (
                <button
                  key={c.id}
                  onClick={() => void addRow(c.id)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <span>
                    <span className="font-medium">{c.label}</span>
                    {c.sublabel && <span className="ml-2 text-xs text-muted-foreground">{c.sublabel}</span>}
                  </span>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
          {searching && (
            <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="mr-1.5 h-3.5 w-3.5" /> Template
        </Button>
        <label className="inline-flex">
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importCsv(f);
              e.currentTarget.value = "";
            }}
          />
          <Button variant="outline" size="sm" asChild>
            <span className="cursor-pointer">
              <Upload className="mr-1.5 h-3.5 w-3.5" /> Import CSV
            </span>
          </Button>
        </label>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">{mode.kind === "byStore" ? "Product" : "Store"}</th>
              <th className="px-3 py-2 text-left w-40">Quantity</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right w-16">—</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                  No entries yet. Search above to add one.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const qty = r.stock_quantity;
                const status =
                  qty === null
                    ? { label: "Ask the store", cls: "bg-muted text-muted-foreground" }
                    : qty === 0
                      ? { label: "Out", cls: "bg-destructive/15 text-destructive border-destructive/30" }
                      : qty <= 5
                        ? { label: "Limited", cls: "bg-amber-500/15 text-amber-800 border-amber-500/30" }
                        : { label: "Available", cls: "bg-emerald-500/15 text-emerald-800 border-emerald-500/30" };
                return (
                  <tr key={r.id}>
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.label}</div>
                      {r.sublabel && (
                        <div className="text-xs text-muted-foreground">{r.sublabel}</div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={0}
                        value={r.stock_quantity ?? ""}
                        placeholder="Ask"
                        onChange={(e) => void updateQty(r.id, e.target.value)}
                        className="h-8 w-24"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className={`border ${status.cls}`}>{status.label}</Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="ghost" size="sm" onClick={() => void removeRow(r.id)} aria-label="Remove">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}