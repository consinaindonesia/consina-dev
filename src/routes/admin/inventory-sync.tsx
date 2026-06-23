import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Boxes,
  CheckCircle2,
  CloudDownload,
  Loader2,
  RefreshCw,
  Search,
  Siren,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { EmptyState } from "@/components/admin/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  getOdooInventoryConfig,
  pullOdooInventorySnapshot,
} from "@/lib/odoo-inventory.functions";

export const Route = createFileRoute("/admin/inventory-sync")({
  head: () => ({
    meta: [
      { title: "Inventory Sync — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InventorySyncPage,
});

type SyncStatus = "received" | "applied" | "ignored" | "failed";

type SyncRow = {
  id: string;
  source: string;
  event_type: string;
  external_event_id: string | null;
  external_reference: string | null;
  odoo_sku: string | null;
  odoo_location_code: string | null;
  sync_status: SyncStatus;
  change_mode: "absolute" | "delta";
  stock_before: number | null;
  stock_after: number | null;
  delta: number | null;
  error_message: string | null;
  processed_at: string | null;
  created_at: string;
  product_id: string | null;
  payload: Record<string, unknown> | null;
};

type StatusFilter = "all" | SyncStatus;

type OdooConfig = {
  configured: boolean;
  baseUrl: string | null;
  database: string | null;
  username: string | null;
  missing: string[];
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function formatDelta(value: number | null) {
  if (value == null) return "—";
  if (value > 0) return `+${value}`;
  return `${value}`;
}

function statusBadgeVariant(status: SyncStatus) {
  switch (status) {
    case "applied":
      return "default" as const;
    case "failed":
      return "destructive" as const;
    case "ignored":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

function statusIcon(status: SyncStatus) {
  switch (status) {
    case "applied":
      return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-600" />;
    case "ignored":
      return <Siren className="h-4 w-4 text-amber-600" />;
    default:
      return <Loader2 className="h-4 w-4 text-muted-foreground" />;
  }
}

function InventorySyncPage() {
  const [rows, setRows] = useState<SyncRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [config, setConfig] = useState<OdooConfig | null>(null);

  const fetchConfig = useServerFn(getOdooInventoryConfig);
  const pullSnapshot = useServerFn(pullOdooInventorySnapshot);

  async function load(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    const { data, error } = await supabase
      .from("inventory_sync_events" as never)
      .select(
        "id, source, event_type, external_event_id, external_reference, odoo_sku, odoo_location_code, sync_status, change_mode, stock_before, stock_after, delta, error_message, processed_at, created_at, product_id, payload",
      )
      .order("created_at", { ascending: false })
      .limit(250);

    setLoading(false);
    setRefreshing(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setRows((data as SyncRow[]) ?? []);
  }

  useEffect(() => {
    void load();
    void fetchConfig().then((result) => setConfig(result as OdooConfig)).catch((error) => {
      const message = error instanceof Error ? error.message : "Failed to load Odoo config";
      toast.error(message);
    });

    const channel = supabase
      .channel("admin-inventory-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory_sync_events" },
        () => void load(true),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  async function handleManualSync() {
    setSyncing(true);
    try {
      const result = await pullSnapshot({ data: { limit: 1000 } });
      const summary = (result as {
        summary?: { applied: number; failed: number; ignored: number; total: number };
        fetched?: number;
      }).summary;
      const fetched = (result as { fetched?: number }).fetched ?? 0;
      toast.success(
        `Manual Odoo sync selesai. Fetched ${fetched}, applied ${summary?.applied ?? 0}, failed ${summary?.failed ?? 0}.`,
      );
      await load(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Manual Odoo sync failed";
      toast.error(message);
    } finally {
      setSyncing(false);
    }
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (status !== "all" && row.sync_status !== status) return false;
      if (!needle) return true;
      const haystack = [
        row.odoo_sku,
        row.external_event_id,
        row.external_reference,
        row.odoo_location_code,
        row.error_message,
        row.product_id,
        JSON.stringify(row.payload ?? {}),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [rows, status, query]);

  const stats = useMemo(() => {
    const failed = rows.filter((row) => row.sync_status === "failed").length;
    const applied = rows.filter((row) => row.sync_status === "applied").length;
    const ignored = rows.filter((row) => row.sync_status === "ignored").length;
    const unmapped = rows.filter(
      (row) => row.sync_status === "failed" && /mapping/i.test(row.error_message ?? ""),
    ).length;
    return {
      total: rows.length,
      failed,
      applied,
      ignored,
      unmapped,
    };
  }, [rows]);

  const failedSkus = useMemo(() => {
    const seen = new Set<string>();
    return rows
      .filter((row) => row.sync_status === "failed" && row.odoo_sku)
      .filter((row) => {
        const sku = row.odoo_sku as string;
        if (seen.has(sku)) return false;
        seen.add(sku);
        return true;
      })
      .slice(0, 12);
  }, [rows]);

  return (
    <AdminShell>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Odoo Integration
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-primary">
            Inventory Sync Monitor
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Pantau event stok dari Odoo, lihat SKU yang gagal cocok ke produk lokal,
            dan review perubahan stok yang sudah diterapkan ke storefront.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load(true)} disabled={refreshing}>
          {refreshing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </header>

      <section className="mt-6 rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-primary">Odoo Connection</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Base URL sudah diarahkan ke instance Odoo. Manual pull memakai JSON-RPC standar Odoo.
            </p>
          </div>
          <Button
            onClick={() => void handleManualSync()}
            disabled={syncing || !config?.configured}
          >
            {syncing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CloudDownload className="mr-2 h-4 w-4" />
            )}
            Pull Stock Now
          </Button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ConfigCell label="Base URL" value={config?.baseUrl ?? "—"} />
          <ConfigCell label="Database" value={config?.database ?? "—"} />
          <ConfigCell label="Username" value={config?.username ?? "—"} />
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Status
            </div>
            <div className="mt-2">
              <Badge variant={config?.configured ? "default" : "destructive"}>
                {config?.configured ? "Ready" : "Needs config"}
              </Badge>
            </div>
            {!config?.configured && config?.missing?.length ? (
              <div className="mt-2 text-xs text-red-600">
                Missing: {config.missing.join(", ")}
              </div>
            ) : (
              <div className="mt-2 text-xs text-muted-foreground">
                Siap untuk manual pull dan webhook.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Boxes className="h-5 w-5 text-primary" />}
          label="Total Events"
          value={stats.total}
          helper="250 event terakhir"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          label="Applied"
          value={stats.applied}
          helper="stok berhasil diupdate"
        />
        <StatCard
          icon={<TriangleAlert className="h-5 w-5 text-red-600" />}
          label="Failed"
          value={stats.failed}
          helper="butuh pengecekan"
        />
        <StatCard
          icon={<Siren className="h-5 w-5 text-amber-600" />}
          label="Unmapped SKU"
          value={stats.unmapped}
          helper="SKU Odoo belum ketemu mapping"
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-primary">Recent Sync Events</h2>
              <p className="text-xs text-muted-foreground">
                Filter status, cari SKU, lalu telusuri payload error bila perlu.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusFilter)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">All statuses</option>
                <option value="received">Received</option>
                <option value="applied">Applied</option>
                <option value="ignored">Ignored</option>
                <option value="failed">Failed</option>
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari SKU / reference / error"
                  className="h-9 w-64 rounded-md border border-input bg-background pl-9 pr-3 text-sm"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading inventory sync events…
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="Boxes"
              title="Belum ada event sync"
              description="Webhook Odoo yang masuk akan tampil di sini."
            />
          ) : (
            <div className="mt-4 overflow-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">SKU</th>
                    <th className="px-3 py-2">Reference</th>
                    <th className="px-3 py-2">Mode</th>
                    <th className="px-3 py-2">Before</th>
                    <th className="px-3 py-2">After</th>
                    <th className="px-3 py-2">Delta</th>
                    <th className="px-3 py-2">When</th>
                    <th className="px-3 py-2">Issue</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.id} className="border-t align-top">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {statusIcon(row.sync_status)}
                          <Badge variant={statusBadgeVariant(row.sync_status)}>
                            {row.sync_status}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-semibold text-foreground">
                        {row.odoo_sku ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        <div>{row.external_reference ?? row.external_event_id ?? "—"}</div>
                        {row.odoo_location_code && (
                          <div className="mt-1 text-xs">Loc: {row.odoo_location_code}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 uppercase text-xs text-muted-foreground">
                        {row.change_mode}
                      </td>
                      <td className="px-3 py-3">{row.stock_before ?? "—"}</td>
                      <td className="px-3 py-3">{row.stock_after ?? "—"}</td>
                      <td className="px-3 py-3 font-medium">{formatDelta(row.delta)}</td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        <div>{formatDate(row.created_at)}</div>
                        {row.processed_at && <div>Processed: {formatDate(row.processed_at)}</div>}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {row.error_message ? (
                          <span className="text-red-600">{row.error_message}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="text-lg font-bold text-primary">Failed SKU Snapshot</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              SKU gagal terbaru yang biasanya perlu ditambahkan ke mapping atau dicek penulisannya.
            </p>
            {failedSkus.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Belum ada SKU gagal.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {failedSkus.map((row) => (
                  <div key={row.id} className="rounded-lg border border-red-100 bg-red-50/40 p-3">
                    <div className="font-semibold text-foreground">{row.odoo_sku}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {row.external_reference ?? row.external_event_id ?? "No reference"}
                    </div>
                    {row.error_message && (
                      <div className="mt-2 text-xs text-red-700">{row.error_message}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="text-lg font-bold text-primary">What To Configure in Odoo</h2>
            <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
              <li>
                POST webhook ke <code>/api/public/hooks/odoo-stock</code>.
              </li>
              <li>
                Kirim header <code>Authorization: Bearer ...</code> atau <code>x-odoo-api-key</code>.
              </li>
              <li>
                Sertakan SKU konsisten dari Odoo: <code>sku</code>, <code>default_code</code>, atau <code>internal_reference</code>.
              </li>
              <li>
                Untuk update stok absolut, kirim field <code>stock</code> atau <code>qty_available</code>.
              </li>
              <li>
                Untuk update selisih stok, kirim <code>delta</code> atau <code>quantity</code>.
              </li>
              <li>
                Untuk manual pull JSON-RPC, isi juga <code>ODOO_DATABASE</code> dan <code>ODOO_USERNAME</code>.
              </li>
            </ul>
            <div className="mt-4">
              <Link to="/admin/activity" className="text-xs font-semibold text-secondary hover:underline">
                Lihat activity log lengkap →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}

function ConfigCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 break-all text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  helper: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 text-3xl font-black tracking-tight text-primary">{value}</div>
          <div className="mt-2 text-xs text-muted-foreground">{helper}</div>
        </div>
        <div className="rounded-full bg-muted/50 p-3">{icon}</div>
      </div>
    </div>
  );
}
