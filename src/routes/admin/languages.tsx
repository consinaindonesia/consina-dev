import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, X as XIcon, Loader2, Sparkles } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { bulkTranslateProducts, approveTranslations } from "@/lib/bulk-translate.functions";

export const Route = createFileRoute("/admin/languages")({
  head: () => ({
    meta: [{ title: "Languages — Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: LanguagesPage,
});

const FIELDS = ["name", "short_description", "description"] as const;
type Field = (typeof FIELDS)[number];
const FIELD_LABEL: Record<Field, string> = {
  name: "Name",
  short_description: "Short desc.",
  description: "Full desc.",
};

type Category = { id: string; name_en: string };

type Row = {
  id: string;
  sku: string;
  name_en: string;
  name_id: string;
  short_description_en: string | null;
  short_description_id: string | null;
  description_en: string | null;
  description_id: string | null;
  updated_at: string;
  category_id: string | null;
  image_url: string | null;
  ai_translated_fields: string[];
};

const COST_PER_PRODUCT = 0.05;

function has(v: string | null | undefined) {
  return !!(v && v.trim());
}

function sameFilledText(a: string | null | undefined, b: string | null | undefined) {
  const left = (a ?? "").trim();
  const right = (b ?? "").trim();
  return left !== "" && left === right;
}

function translated(source: string | null | undefined, target: string | null | undefined) {
  return has(source) && has(target) && !sameFilledText(source, target);
}

function fmtDate(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 60) return `${Math.max(1, m)}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function LangCell({ row, lang }: { row: Row; lang: "id" | "en" }) {
  const isId = lang === "id";
  const filled = {
    name: isId ? has(row.name_id) : translated(row.name_id, row.name_en),
    short_description: isId
      ? has(row.short_description_id)
      : translated(row.short_description_id, row.short_description_en),
    description: isId
      ? has(row.description_id)
      : translated(row.description_id, row.description_en),
  };
  return (
    <div className="flex items-center gap-2 text-xs">
      {FIELDS.map((f) => (
        <span key={f} className="flex items-center gap-1">
          {filled[f] ? (
            <Check className="h-3.5 w-3.5 text-green-600" />
          ) : (
            <XIcon className="h-3.5 w-3.5 text-red-500" />
          )}
          <span className="text-muted-foreground">{FIELD_LABEL[f]}</span>
        </span>
      ))}
    </div>
  );
}

function LanguagesPage() {
  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Languages</h1>
          <p className="text-sm text-muted-foreground">
            Translation status across all products. Bulk-translate with AI and review pending suggestions.
          </p>
        </div>
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="pending">Pending Review</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard" className="mt-4">
            <DashboardTab />
          </TabsContent>
          <TabsContent value="pending" className="mt-4">
            <PendingReviewTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminShell>
  );
}

/* ───────── Dashboard tab ───────── */

function DashboardTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [status, setStatus] = useState<"all" | "missing" | "complete">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState<"en" | "id" | null>(null);
  const [running, setRunning] = useState(false);

  const callBulk = useServerFn(bulkTranslateProducts);

  useEffect(() => {
    void supabase
      .from("categories")
      .select("id, name_en")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setCategories((data ?? []) as Category[]));
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, sku, name_en, name_id, short_description_en, short_description_id, description_en, description_id, updated_at, category_id, ai_translated_fields, product_images(image_url, is_primary, sort_order)",
      )
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1000);
    if (error) {
      toast.error("Failed to load products");
      setLoading(false);
      return;
    }
    type Raw = Omit<Row, "image_url"> & {
      product_images:
        | Array<{ image_url: string; is_primary: boolean; sort_order: number }>
        | null;
    };
    const mapped: Row[] = (data as Raw[] | null ?? []).map((r) => {
      const imgs = (r.product_images ?? [])
        .slice()
        .sort(
          (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
        );
      return {
        ...r,
        image_url: imgs[0]?.image_url ?? null,
        ai_translated_fields: r.ai_translated_fields ?? [],
      };
    });
    setRows(mapped);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  // Stats over ALL rows (not filtered)
  const stats = useMemo(() => {
    const total = rows.length;
    let full = 0;
    let idOnly = 0;
    let enOnly = 0;
    for (const r of rows) {
      const id = has(r.name_id) && has(r.description_id);
      const en =
        translated(r.name_id, r.name_en) &&
        translated(r.description_id, r.description_en);
      if (id && en) full += 1;
      else if (id) idOnly += 1;
      else if (en) enOnly += 1;
    }
    return { total, full, idOnly, enOnly };
  }, [rows]);

  const pct = stats.total ? Math.round((stats.full / stats.total) * 100) : 0;
  const barColor =
    pct >= 90 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500";

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (categoryId !== "all" && r.category_id !== categoryId) return false;
      if (status !== "all") {
        const complete =
          translated(r.name_id, r.name_en) &&
          translated(r.description_id, r.description_en);
        if (status === "complete" && !complete) return false;
        if (status === "missing" && complete) return false;
      }
      if (s) {
        if (
          !r.sku.toLowerCase().includes(s) &&
          !r.name_en.toLowerCase().includes(s) &&
          !r.name_id.toLowerCase().includes(s)
        )
          return false;
      }
      return true;
    });
  }, [rows, search, categoryId, status]);

  const selectedRows = filtered.filter((r) => selected.has(r.id));
  const canTranslateToEn = selectedRows.some(
    (r) => has(r.name_id) || has(r.short_description_id) || has(r.description_id),
  );
  const canTranslateToId = selectedRows.some(
    (r) => has(r.name_en) || has(r.short_description_en) || has(r.description_en),
  );

  const toggleAll = (v: boolean) =>
    setSelected(v ? new Set(filtered.map((r) => r.id)) : new Set());
  const toggleOne = (id: string, v: boolean) =>
    setSelected((s) => {
      const n = new Set(s);
      if (v) n.add(id);
      else n.delete(id);
      return n;
    });

  const runBulk = async () => {
    if (!target) return;
    const ids = Array.from(selected);
    setRunning(true);
    try {
      const res = (await callBulk({
        data: { productIds: ids, targetLang: target },
      })) as { translatedCount: number; skippedCount: number; errors: string[] };
      toast.success(
        `Translated ${res.translatedCount} product${res.translatedCount === 1 ? "" : "s"}. Review and approve in the products list.`,
      );
      if (res.errors.length) {
        console.warn("Bulk translate errors:", res.errors);
        toast.warning(`${res.errors.length} field(s) failed — see console.`);
      }
      setSelected(new Set());
      setTarget(null);
      await load();
    } catch (e) {
      toast.error((e as Error).message || "Bulk translate failed");
    } finally {
      setRunning(false);
    }
  };

  const cost = (selected.size * COST_PER_PRODUCT).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total products" value={stats.total} />
        <StatCard label="Fully translated" value={stats.full} accent="text-green-600" />
        <StatCard label="Indonesian only" value={stats.idOnly} accent="text-yellow-600" />
        <StatCard label="English only" value={stats.enOnly} accent="text-yellow-600" />
      </div>

      {/* Progress bar */}
      <div className="rounded-lg border bg-white p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm font-semibold">Translation coverage</span>
          <span className="text-sm text-muted-foreground">{pct}% fully translated</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
          <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-white p-3">
        <Input
          placeholder="Search by SKU or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-64"
        />
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name_en}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="missing">Missing translations</SelectItem>
            <SelectItem value="complete">Fully translated</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {selected.size} selected
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={selected.size === 0 || !canTranslateToEn || running}
            onClick={() => setTarget("en")}
          >
            <Sparkles className="mr-1 h-3.5 w-3.5" /> AI-translate selected to English
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={selected.size === 0 || !canTranslateToId || running}
            onClick={() => setTarget("id")}
          >
            <Sparkles className="mr-1 h-3.5 w-3.5" /> AI-translate selected to Indonesian
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="w-10 px-3 py-3">
                <Checkbox
                  checked={filtered.length > 0 && filtered.every((r) => selected.has(r.id))}
                  onCheckedChange={(v) => toggleAll(!!v)}
                />
              </th>
              <th className="w-14 px-3 py-3">Image</th>
              <th className="px-3 py-3">SKU</th>
              <th className="px-3 py-3">Name</th>
              <th className="px-3 py-3">ID coverage</th>
              <th className="px-3 py-3">EN coverage</th>
              <th className="px-3 py-3">Updated</th>
              <th className="w-32 px-3 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">No products match.</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.id} className="border-t hover:bg-muted/20">
                <td className="px-3 py-2">
                  <Checkbox
                    checked={selected.has(r.id)}
                    onCheckedChange={(v) => toggleOne(r.id, !!v)}
                  />
                </td>
                <td className="px-3 py-2">
                  {r.image_url ? (
                    <img src={r.image_url} alt="" className="h-10 w-10 rounded object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted" />
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{r.sku}</td>
                <td className="px-3 py-2">
                  <div className="font-medium">{r.name_en || r.name_id || "—"}</div>
                  {r.ai_translated_fields.length > 0 && (
                    <Badge variant="secondary" className="mt-1 text-[10px]">
                      AI-translated · {r.ai_translated_fields.length}
                    </Badge>
                  )}
                </td>
                <td className="px-3 py-2"><LangCell row={r} lang="id" /></td>
                <td className="px-3 py-2"><LangCell row={r} lang="en" /></td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{fmtDate(r.updated_at)}</td>
                <td className="px-3 py-2 text-right">
                  <Link
                    to="/admin/products/$id/edit"
                    params={{ id: r.id }}
                    search={{ tab: "translations" }}
                    className="inline-flex items-center rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted"
                  >
                    Translate
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Confirm dialog */}
      <AlertDialog open={target !== null} onOpenChange={(o) => !o && !running && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Translate {selected.size} product{selected.size === 1 ? "" : "s"} to{" "}
              {target === "en" ? "English" : "Indonesian"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Use AI to translate name, short description, and full description for{" "}
              {selected.size} product{selected.size === 1 ? "" : "s"}. This will fill any
              empty target fields but won't touch fields that already have content.
              Estimated cost: ${cost}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={running}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); void runBulk(); }} disabled={running}>
              {running ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Translating…</> : "Translate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${accent ?? ""}`}>{value}</p>
    </div>
  );
}

/* ───────── Pending Review tab ───────── */

type PendingRow = Row;

function PendingReviewTab() {
  const [rows, setRows] = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const callApprove = useServerFn(approveTranslations);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, sku, name_en, name_id, short_description_en, short_description_id, description_en, description_id, updated_at, category_id, ai_translated_fields, product_images(image_url, is_primary, sort_order)",
      )
      .not("ai_translated_fields", "eq", "{}")
      .order("updated_at", { ascending: false })
      .limit(500);
    if (error) {
      toast.error("Failed to load pending translations");
      setLoading(false);
      return;
    }
    type Raw = Omit<PendingRow, "image_url"> & {
      product_images:
        | Array<{ image_url: string; is_primary: boolean; sort_order: number }>
        | null;
    };
    const mapped: PendingRow[] = (data as Raw[] | null ?? [])
      .map((r) => {
        const imgs = (r.product_images ?? [])
          .slice()
          .sort(
            (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
          );
        return {
          ...r,
          image_url: imgs[0]?.image_url ?? null,
          ai_translated_fields: r.ai_translated_fields ?? [],
        };
      })
      .filter((r) => r.ai_translated_fields.length > 0);
    setRows(mapped);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const approve = async (id: string) => {
    setBusy(id);
    try {
      await callApprove({ data: { productId: id } });
      toast.success("Approved");
      setRows((rs) => rs.filter((r) => r.id !== id));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-10 text-center text-sm text-muted-foreground">
        Nothing pending. AI-translated content will appear here for review.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <div key={r.id} className="rounded-lg border bg-white p-4">
          <div className="flex items-start gap-4">
            {r.image_url ? (
              <img src={r.image_url} alt="" className="h-16 w-16 rounded object-cover" />
            ) : (
              <div className="h-16 w-16 rounded bg-muted" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{r.name_en || r.name_id}</h3>
                <span className="font-mono text-xs text-muted-foreground">{r.sku}</span>
                <Badge variant="secondary" className="text-[10px]">
                  AI · {r.ai_translated_fields.length} field{r.ai_translated_fields.length === 1 ? "" : "s"}
                </Badge>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <SideBySide title="Indonesian" rowData={r} lang="id" />
                <SideBySide title="English" rowData={r} lang="en" />
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Link
              to="/admin/products/$id/edit"
              params={{ id: r.id }}
              search={{ tab: "translations" }}
              className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-muted"
            >
              Edit
            </Link>
            <Button onClick={() => void approve(r.id)} disabled={busy === r.id}>
              {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SideBySide({
  title,
  rowData,
  lang,
}: {
  title: string;
  rowData: PendingRow;
  lang: "id" | "en";
}) {
  const getVal = (f: Field): string => {
    const key = `${f}_${lang}` as keyof PendingRow;
    return (rowData[key] as string | null) ?? "";
  };
  const isAi = (f: Field) => rowData.ai_translated_fields.includes(`${f}_${lang}`);
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="space-y-2 text-sm">
        {FIELDS.map((f) => (
          <div key={f}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">{FIELD_LABEL[f]}</span>
              {isAi(f) && (
                <Badge variant="outline" className="text-[10px]">AI</Badge>
              )}
            </div>
            <p className="line-clamp-3 text-sm">{getVal(f) || <span className="text-muted-foreground">—</span>}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
