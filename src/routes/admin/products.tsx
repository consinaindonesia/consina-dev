import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Package,
  MoreHorizontal,
  ChevronRight,
  ChevronLeft,
  X,
  Upload,
  Plus,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { EmptyState } from "@/components/admin/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/admin/products")({
  head: () => ({ meta: [{ title: "Products — Admin" }, { name: "robots", content: "noindex" }] }),
  validateSearch: (s: Record<string, unknown>) => {
    const v = s.lang;
    const lang: LangFilter =
      v === "id_only" || v === "en_only" || v === "both" || v === "missing" ? v : "all";
    return { lang };
  },
  component: ProductsPage,
});

type StatusFilter = "all" | "active" | "inactive";
type StockFilter = "all" | "in_stock" | "low_stock" | "out_of_stock";
type LangFilter = "all" | "id_only" | "en_only" | "both" | "missing";

type Category = { id: string; name_en: string };

type ProductRow = {
  id: string;
  name_en: string;
  name_id: string;
  sku: string;
  price_idr: number;
  stock_status: string;
  is_active: boolean;
  updated_at: string;
  category_id: string | null;
  category_name: string | null;
  image_url: string | null;
};

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

function formatIDR(n: number) {
  return "Rp " + new Intl.NumberFormat("id-ID").format(n);
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function ProductsPage() {
  const navigate = useNavigate();
  const { lang: initialLang } = Route.useSearch();

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounced(searchInput.trim(), 300);
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [stock, setStock] = useState<StockFilter>("all");
  const [lang, setLang] = useState<LangFilter>(initialLang);

  // Keep state in sync if URL changes (e.g. dashboard link with ?lang=missing)
  useEffect(() => {
    setLang(initialLang);
  }, [initialLang]);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtersActive =
    !!search || category !== "all" || status !== "all" || stock !== "all" || lang !== "all";

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Load categories once
  const categoriesLoaded = useRef(false);
  useEffect(() => {
    if (categoriesLoaded.current) return;
    categoriesLoaded.current = true;
    void supabase
      .from("categories")
      .select("id, name_en")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setCategories((data ?? []) as Category[]));
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [search, category, status, stock, lang, pageSize]);

  // Load products
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function run() {
      let q = supabase
        .from("products")
        .select(
          "id, name_en, name_id, sku, price_idr, stock_status, is_active, updated_at, category_id, categories(name_en), product_images(image_url, is_primary, sort_order)",
          { count: "exact" },
        )
        .order("updated_at", { ascending: false });

      if (search) {
        const s = search.replace(/[%,]/g, "");
        q = q.or(`name_en.ilike.%${s}%,name_id.ilike.%${s}%,sku.ilike.%${s}%`);
      }
      if (category !== "all") q = q.eq("category_id", category);
      if (status !== "all") q = q.eq("is_active", status === "active");
      if (stock !== "all") q = q.eq("stock_status", stock);

      const from = (page - 1) * pageSize;
      q = q.range(from, from + pageSize - 1);

      const { data, count, error } = await q;
      if (cancelled) return;

      if (error) {
        toast.error("Failed to load products");
        setRows([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      type Raw = {
        id: string;
        name_en: string;
        name_id: string;
        sku: string;
        price_idr: number;
        stock_status: string;
        is_active: boolean;
        updated_at: string;
        category_id: string | null;
        categories: { name_en: string } | null;
        product_images: Array<{ image_url: string; is_primary: boolean; sort_order: number }> | null;
      };

      let mapped: ProductRow[] = (data as Raw[] | null ?? []).map((r) => {
        const imgs = (r.product_images ?? []).slice().sort(
          (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
        );
        return {
          id: r.id,
          name_en: r.name_en,
          name_id: r.name_id,
          sku: r.sku,
          price_idr: r.price_idr,
          stock_status: r.stock_status,
          is_active: r.is_active,
          updated_at: r.updated_at,
          category_id: r.category_id,
          category_name: r.categories?.name_en ?? null,
          image_url: imgs[0]?.image_url ?? null,
        };
      });

      // Language filter is applied client-side on the current page slice
      if (lang !== "all") {
        mapped = mapped.filter((r) => {
          const hasId = !!r.name_id?.trim();
          const hasEn = !!r.name_en?.trim();
          if (lang === "id_only") return hasId && !hasEn;
          if (lang === "en_only") return hasEn && !hasId;
          if (lang === "both") return hasId && hasEn;
          if (lang === "missing") return !hasId || !hasEn;
          return true;
        });
      }

      setRows(mapped);
      setTotal(count ?? 0);
      setLoading(false);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [search, category, status, stock, lang, page, pageSize]);

  function clearFilters() {
    setSearchInput("");
    setCategory("all");
    setStatus("all");
    setStock("all");
    setLang("all");
  }

  async function toggleActive(row: ProductRow, next: boolean) {
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, is_active: next } : r)));
    const { error } = await supabase.from("products").update({ is_active: next }).eq("id", row.id);
    if (error) {
      toast.error("Failed to update status");
      setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, is_active: !next } : r)));
    } else {
      toast.success(next ? "Product activated" : "Product deactivated");
    }
  }

  function toggleSelect(id: string, checked: boolean) {
    setSelected((s) => {
      const next = new Set(s);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleSelectAll(checked: boolean) {
    setSelected(checked ? new Set(rows.map((r) => r.id)) : new Set());
  }

  async function bulkSetActive(active: boolean) {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const { error } = await supabase.from("products").update({ is_active: active }).in("id", ids);
    if (error) toast.error("Bulk update failed");
    else {
      toast.success(`${ids.length} product${ids.length === 1 ? "" : "s"} ${active ? "activated" : "deactivated"}`);
      setRows((rs) => rs.map((r) => (ids.includes(r.id) ? { ...r, is_active: active } : r)));
      setSelected(new Set());
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error("Delete failed");
    else {
      toast.success("Product deleted");
      setRows((rs) => rs.filter((r) => r.id !== id));
      setTotal((t) => Math.max(0, t - 1));
    }
  }

  async function bulkDelete() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} product${ids.length === 1 ? "" : "s"}? This cannot be undone.`)) return;
    const { error } = await supabase.from("products").delete().in("id", ids);
    if (error) toast.error("Bulk delete failed");
    else {
      toast.success(`${ids.length} deleted`);
      setRows((rs) => rs.filter((r) => !ids.includes(r.id)));
      setTotal((t) => Math.max(0, t - ids.length));
      setSelected(new Set());
    }
  }

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someSelected = rows.some((r) => selected.has(r.id)) && !allSelected;

  const showEmptyAll = !loading && total === 0 && !filtersActive;
  const showEmptyFiltered = !loading && rows.length === 0 && filtersActive;

  return (
    <AdminShell>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <nav className="text-xs text-muted-foreground">
            <Link to="/admin" className="hover:text-foreground">Dashboard</Link>
            <span className="mx-1.5">/</span>
            <span className="text-foreground">Products</span>
          </nav>
          <h1 className="mt-2 font-[Archivo] text-2xl font-black tracking-tight text-primary">
            Products <span className="text-muted-foreground">({total})</span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => toast.info("CSV import coming soon")}>
            <Upload className="mr-1.5 h-4 w-4" /> Import CSV
          </Button>
          <Button size="sm" asChild>
            <Link to="/admin/products">
              <Plus className="mr-1.5 h-4 w-4" /> New Product
            </Link>
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mt-6 flex flex-wrap items-center gap-2 rounded-xl bg-card p-3 shadow-sm">
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name or SKU..."
          className="w-full sm:w-72"
        />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name_en}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="h-9 w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={stock} onValueChange={(v) => setStock(v as StockFilter)}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Stock" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stock</SelectItem>
            <SelectItem value="in_stock">In Stock</SelectItem>
            <SelectItem value="low_stock">Low Stock</SelectItem>
            <SelectItem value="out_of_stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
        <Select value={lang} onValueChange={(v) => setLang(v as LangFilter)}>
          <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Languages" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All languages</SelectItem>
            <SelectItem value="id_only">Indonesian only</SelectItem>
            <SelectItem value="en_only">English only</SelectItem>
            <SelectItem value="both">Both</SelectItem>
            <SelectItem value="missing">Missing translations</SelectItem>
          </SelectContent>
        </Select>
        {filtersActive && (
          <button onClick={clearFilters} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:underline">
            <X className="h-3 w-3" /> Clear filters
          </button>
        )}
      </div>

      {/* Table card */}
      <div className="mt-4 overflow-hidden rounded-xl bg-card shadow-sm">
        {/* Loading bar */}
        <div className="h-0.5 w-full overflow-hidden bg-muted">
          {loading && (
            <div className="h-full w-1/3 animate-[loadingbar_1.2s_ease-in-out_infinite] bg-secondary" />
          )}
        </div>
        <style>{`@keyframes loadingbar { 0%{transform:translateX(-100%);} 100%{transform:translateX(400%);} }`}</style>

        {showEmptyAll ? (
          <EmptyState
            icon="Package"
            title="No products yet"
            description="Add your first product to start building your catalog."
            actionLabel="+ Add your first product"
            actionHref="/admin/products"
          />
        ) : showEmptyFiltered ? (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">
              No products match your filters. Try adjusting them or{" "}
              <button onClick={clearFilters} className="font-semibold text-secondary hover:underline">
                clearing filters
              </button>.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="w-10 px-3 py-3">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={(c) => toggleSelectAll(!!c)}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="w-14 px-2 py-3"></th>
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">SKU</th>
                  <th className="px-3 py-3">Category</th>
                  <th className="px-3 py-3 text-right">Price</th>
                  <th className="px-3 py-3">Stock</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Updated</th>
                  <th className="w-10 px-2 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  return (
                    <tr
                      key={r.id}
                      className="cursor-pointer border-b border-border/60 transition-colors hover:bg-muted/40"
                      onClick={() => navigate({ to: "/admin/products" })}
                    >
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected.has(r.id)}
                          onCheckedChange={(c) => toggleSelect(r.id, !!c)}
                          aria-label={`Select ${r.name_en}`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <div className="h-10 w-10 overflow-hidden rounded bg-muted">
                          {r.image_url ? (
                            <img src={r.image_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <Package size={16} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="min-w-0">
                            <NameCell row={r} />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{r.sku}</td>
                      <td className="px-3 py-3 text-muted-foreground">{r.category_name ?? "—"}</td>
                      <td className="px-3 py-3 text-right font-medium">{formatIDR(r.price_idr)}</td>
                      <td className="px-3 py-3"><StockBadge status={r.stock_status} /></td>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <Switch checked={r.is_active} onCheckedChange={(c) => toggleActive(r, c)} />
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">{timeAgo(r.updated_at)}</td>
                      <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => toast.info("Edit coming soon")}>Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toast.info("Duplicate coming soon")}>Duplicate</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleActive(r, false)}>Archive</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => deleteProduct(r.id)}>
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!showEmptyAll && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Rows per page</span>
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="h-8 w-[80px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span>Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 flex-wrap items-center gap-2 rounded-xl bg-primary px-4 py-3 text-primary-foreground shadow-lg">
          <span className="text-sm font-semibold">
            {selected.size} product{selected.size === 1 ? "" : "s"} selected
          </span>
          <div className="h-4 w-px bg-primary-foreground/30" />
          <button onClick={() => bulkSetActive(true)} className="text-xs font-semibold hover:underline">Activate</button>
          <button onClick={() => bulkSetActive(false)} className="text-xs font-semibold hover:underline">Deactivate</button>
          <button onClick={() => toast.info("Change category coming soon")} className="text-xs font-semibold hover:underline">Change category...</button>
          <button onClick={() => toast.info("Export coming soon")} className="text-xs font-semibold hover:underline">Export selected</button>
          <button onClick={bulkDelete} className="text-xs font-semibold text-red-300 hover:underline">Delete selected</button>
          <div className="h-4 w-px bg-primary-foreground/30" />
          <button onClick={() => setSelected(new Set())} className="text-xs opacity-75 hover:opacity-100">Cancel</button>
        </div>
      )}
    </AdminShell>
  );
}

function StockBadge({ status }: { status: string }) {
  if (status === "in_stock") return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">In Stock</Badge>;
  if (status === "low_stock") return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Low</Badge>;
  if (status === "out_of_stock") return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Out</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

function NameCell({ row }: { row: ProductRow }) {
  const hasId = !!row.name_id?.trim();
  const hasEn = !!row.name_en?.trim();

  if (!hasId && !hasEn) {
    return <p className="font-semibold text-red-600">(Unnamed product)</p>;
  }

  if (hasId && hasEn) {
    return (
      <>
        <p className="truncate font-semibold text-foreground">{row.name_en}</p>
        <p className="truncate text-xs text-muted-foreground">{row.name_id}</p>
      </>
    );
  }

  const primary = hasEn ? row.name_en : row.name_id;
  const missingLabel = hasEn ? "Missing ID" : "Missing EN";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="truncate font-semibold text-foreground">{primary}</p>
      <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">{missingLabel}</Badge>
    </div>
  );
}
