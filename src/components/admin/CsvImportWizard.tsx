import { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { Download, Upload, FileText, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { importProductsCsv } from "@/lib/csv-import.functions";

export const CSV_COLUMNS = [
  "sku",
  "category_slug",
  "category_path",
  "name_id",
  "name_en",
  "short_description_id",
  "short_description_en",
  "description_id",
  "description_en",
  "price_idr",
  "capacity",
  "weight_grams",
  "stock_status",
] as const;

const EXAMPLE_ROWS: Record<string, string>[] = [
  {
    sku: "CNS-CAR-001",
    category_slug: "carriers",
    category_path: "",
    name_id: "Tas Carrier Rinjani 60L",
    name_en: "Rinjani 60L Carrier",
    short_description_id: "Tas carrier 60 liter untuk pendakian panjang.",
    short_description_en: "60L carrier built for long expeditions.",
    description_id: "Frame aluminium ringan dengan ventilasi punggung.",
    description_en: "Lightweight aluminium frame with ventilated back panel.",
    price_idr: "1850000",
    capacity: "60L",
    weight_grams: "2100",
    stock_status: "in_stock",
  },
  {
    sku: "CNS-TNT-014",
    category_slug: "",
    category_path: "Apparel > Jaket > Softshell | Activities > Hiking",
    name_id: "Tenda Magnum 3 Orang",
    name_en: "Magnum 3-Person Tent",
    short_description_id: "Tenda dome ringan untuk 3 orang.",
    short_description_en: "Lightweight dome tent for 3 people.",
    description_id: "Double layer, tahan air 3000mm.",
    description_en: "Double-layer, 3000mm waterproof rating.",
    price_idr: "2450000",
    capacity: "3P",
    weight_grams: "3200",
    stock_status: "in_stock",
  },
  {
    sku: "CNS-FTW-027",
    category_slug: "footwear",
    category_path: "Activities > Running",
    name_id: "Sepatu Trail Salak",
    name_en: "Salak Trail Shoes",
    short_description_id: "Sepatu trail running dengan grip kuat.",
    short_description_en: "Trail running shoes with aggressive grip.",
    description_id: "Upper mesh breathable, sol Vibram.",
    description_en: "Breathable mesh upper, Vibram outsole.",
    price_idr: "975000",
    capacity: "",
    weight_grams: "680",
    stock_status: "low_stock",
  },
];

type ParsedRow = {
  rowIndex: number;
  raw: Record<string, string>;
  errors: string[];
};

type Step = "template" | "upload" | "validate" | "import" | "review";

type ImportResult = {
  inserted: number;
  updated: number;
  failed: number;
  insertedIds: string[];
  updatedIds: string[];
  errors: Array<{ sku: string; error: string }>;
};

function csvEscape(v: unknown) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: Record<string, unknown>[], cols: readonly string[]) {
  return [
    cols.join(","),
    ...rows.map((r) => cols.map((c) => csvEscape(r[c])).join(",")),
  ].join("\n");
}

function downloadBlob(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function CsvImportWizard({
  open,
  onOpenChange,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onComplete?: () => void;
}) {
  const [step, setStep] = useState<Step>("template");
  const [updateExisting, setUpdateExisting] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [validCategorySlugs, setValidCategorySlugs] = useState<Set<string>>(new Set());
  const [existingSkus, setExistingSkus] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const importFn = useServerFn(importProductsCsv);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("template");
        setRows([]);
        setFileName("");
        setProgress(0);
        setResult(null);
        setImporting(false);
        setUpdateExisting(false);
      }, 200);
    }
  }, [open]);

  function downloadTemplate() {
    const csv = toCsv(EXAMPLE_ROWS, CSV_COLUMNS);
    downloadBlob(csv, "products-template.csv");
    toast.success("Template downloaded");
  }

  async function handleFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File exceeds 5 MB limit");
      return;
    }
    setFileName(file.name);
    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });
    if (parsed.errors.length > 0) {
      toast.error(`CSV parse error: ${parsed.errors[0].message}`);
      return;
    }
    const parsedRows: ParsedRow[] = parsed.data.map((raw, i) => ({
      rowIndex: i + 2, // header is row 1
      raw,
      errors: [],
    }));
    setRows(parsedRows);

    // Load categories + existing SKUs to validate
    const slugs = Array.from(new Set(parsedRows.map((r) => (r.raw.category_slug ?? "").trim()).filter(Boolean)));
    const skus = Array.from(new Set(parsedRows.map((r) => (r.raw.sku ?? "").trim()).filter(Boolean)));
    const [catsRes, prodRes] = await Promise.all([
      slugs.length
        ? supabase.from("categories").select("slug").in("slug", slugs)
        : Promise.resolve({ data: [] as { slug: string }[] }),
      skus.length
        ? supabase.from("products").select("sku").in("sku", skus)
        : Promise.resolve({ data: [] as { sku: string }[] }),
    ]);
    setValidCategorySlugs(new Set((catsRes.data ?? []).map((c) => c.slug)));
    setExistingSkus(new Set((prodRes.data ?? []).map((p) => p.sku)));
    setStep("validate");
  }

  // Compute per-row errors based on validation state
  const validatedRows = useMemo<ParsedRow[]>(() => {
    return rows.map((r) => {
      const errs: string[] = [];
      const sku = (r.raw.sku ?? "").trim();
      const cat = (r.raw.category_slug ?? "").trim();
      const path = (r.raw.category_path ?? "").trim();
      const nameId = (r.raw.name_id ?? "").trim();
      const nameEn = (r.raw.name_en ?? "").trim();
      const priceRaw = (r.raw.price_idr ?? "").trim();
      const price = Number(priceRaw);
      const stock = (r.raw.stock_status ?? "in_stock").trim();

      if (!sku) errs.push("Missing sku");
      if (!cat && !path) errs.push("Need category_slug or category_path");
      if (cat && validCategorySlugs.size > 0 && !validCategorySlugs.has(cat))
        errs.push(`Unknown category: ${cat}`);
      if (path) {
        const paths = path.split("|").map((p) => p.trim()).filter(Boolean);
        if (paths.length === 0) errs.push("Empty category_path");
        for (const p of paths) {
          const segs = p.split(">").map((s) => s.trim()).filter(Boolean);
          if (segs.length === 0) errs.push(`Invalid path: ${p}`);
        }
      }
      if (!nameId && !nameEn) errs.push("Need at least name_id or name_en");
      if (!priceRaw || Number.isNaN(price) || price < 0)
        errs.push("Invalid price_idr");
      if (!["in_stock", "low_stock", "out_of_stock"].includes(stock))
        errs.push(`Invalid stock_status: ${stock}`);
      if (sku && existingSkus.has(sku) && !updateExisting)
        errs.push("SKU exists (enable Update existing)");
      return { ...r, errors: errs };
    });
  }, [rows, validCategorySlugs, existingSkus, updateExisting]);

  const validCount = validatedRows.filter((r) => r.errors.length === 0).length;
  const errorCount = validatedRows.length - validCount;

  function downloadErrorReport() {
    const errored = validatedRows.filter((r) => r.errors.length > 0);
    const out = errored.map((r) => ({ ...r.raw, _row: r.rowIndex, _errors: r.errors.join("; ") }));
    const cols = [...CSV_COLUMNS, "_row", "_errors"];
    downloadBlob(toCsv(out, cols), "import-errors.csv");
  }

  async function startImport() {
    const valid = validatedRows.filter((r) => r.errors.length === 0);
    if (valid.length === 0) {
      toast.error("No valid rows to import");
      return;
    }
    setStep("import");
    setImporting(true);
    setProgress(0);

    const BATCH = 25;
    const aggregate: ImportResult = {
      inserted: 0,
      updated: 0,
      failed: 0,
      insertedIds: [],
      updatedIds: [],
      errors: [],
    };

    try {
      for (let i = 0; i < valid.length; i += BATCH) {
        const slice = valid.slice(i, i + BATCH).map((r) => ({
          sku: r.raw.sku.trim(),
          category_slug: (r.raw.category_slug ?? "").trim(),
          category_path: (r.raw.category_path ?? "").trim(),
          name_id: (r.raw.name_id ?? "").trim(),
          name_en: (r.raw.name_en ?? "").trim(),
          short_description_id: (r.raw.short_description_id ?? "").trim(),
          short_description_en: (r.raw.short_description_en ?? "").trim(),
          description_id: (r.raw.description_id ?? "").trim(),
          description_en: (r.raw.description_en ?? "").trim(),
          price_idr: Number(r.raw.price_idr),
          capacity: (r.raw.capacity ?? "").trim(),
          weight_grams: r.raw.weight_grams ? Number(r.raw.weight_grams) : null,
          stock_status: ((r.raw.stock_status ?? "in_stock").trim() as
            | "in_stock"
            | "low_stock"
            | "out_of_stock"),
        }));
        const res = (await importFn({
          data: { rows: slice, updateExisting },
        })) as ImportResult;
        aggregate.inserted += res.inserted;
        aggregate.updated += res.updated;
        aggregate.failed += res.failed;
        aggregate.insertedIds.push(...res.insertedIds);
        aggregate.updatedIds.push(...res.updatedIds);
        aggregate.errors.push(...res.errors);
        setProgress(Math.round(((i + slice.length) / valid.length) * 100));
      }
      setResult(aggregate);
      setStep("review");
    } catch (e) {
      toast.error(`Import failed: ${(e as Error).message}`);
      setStep("validate");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import Products from CSV</DialogTitle>
          <DialogDescription>
            Step {{ template: 1, upload: 2, validate: 3, import: 4, review: 5 }[step]} of 5
          </DialogDescription>
        </DialogHeader>

        {step === "template" && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Start by downloading the CSV template. It includes 3 example rows showing the expected format
              for all {CSV_COLUMNS.length} columns.
            </p>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Required columns
              </p>
              <div className="flex flex-wrap gap-1.5">
                {CSV_COLUMNS.map((c) => (
                  <code key={c} className="rounded bg-background px-1.5 py-0.5 text-xs">{c}</code>
                ))}
              </div>
            </div>
            <Button onClick={downloadTemplate} className="w-full" size="lg">
              <Download className="mr-2 h-4 w-4" /> Download CSV template
            </Button>
          </div>
        )}

        {step === "upload" && (
          <div className="space-y-4 py-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-muted/20 px-6 py-12 transition-colors hover:border-secondary hover:bg-muted/40"
            >
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div className="text-center">
                <p className="font-semibold">Click to choose a CSV file</p>
                <p className="text-xs text-muted-foreground">Maximum 5 MB</p>
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
                e.target.value = "";
              }}
            />
          </div>
        )}

        {step === "validate" && (
          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 px-4 py-3 text-sm">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{fileName}</span>
                <Badge variant="secondary">{validatedRows.length} rows</Badge>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="font-semibold text-green-600">{validCount} valid</span>
                {errorCount > 0 && (
                  <span className="font-semibold text-red-600">{errorCount} errors</span>
                )}
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={updateExisting}
                onCheckedChange={(c) => setUpdateExisting(!!c)}
              />
              <span>Update existing products when SKU already exists</span>
            </label>

            <div className="max-h-72 overflow-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/60">
                  <tr className="text-left">
                    <th className="px-2 py-2">Row</th>
                    <th className="px-2 py-2">SKU</th>
                    <th className="px-2 py-2">Category</th>
                    <th className="px-2 py-2">Name (EN)</th>
                    <th className="px-2 py-2">Price</th>
                    <th className="px-2 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {validatedRows.slice(0, 10).map((r) => {
                    const bad = r.errors.length > 0;
                    return (
                      <tr key={r.rowIndex} className={bad ? "bg-red-50" : ""}>
                        <td className="px-2 py-1.5 text-muted-foreground">{r.rowIndex}</td>
                        <td className="px-2 py-1.5 font-mono">{r.raw.sku}</td>
                        <td className="px-2 py-1.5">{r.raw.category_slug}</td>
                        <td className="px-2 py-1.5 truncate max-w-[180px]">{r.raw.name_en || r.raw.name_id}</td>
                        <td className="px-2 py-1.5">{r.raw.price_idr}</td>
                        <td className="px-2 py-1.5">
                          {bad ? (
                            <span className="text-red-600" title={r.errors.join("; ")}>
                              {r.errors[0]}
                              {r.errors.length > 1 && ` +${r.errors.length - 1}`}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="h-3 w-3" /> OK
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {validatedRows.length > 10 && (
                <div className="border-t bg-muted/30 px-3 py-2 text-center text-xs text-muted-foreground">
                  + {validatedRows.length - 10} more rows
                </div>
              )}
            </div>

            {errorCount > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold">{errorCount} row{errorCount === 1 ? "" : "s"} have errors and will be skipped.</p>
                  <button onClick={downloadErrorReport} className="mt-1 underline">
                    Download error report
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === "import" && (
          <div className="space-y-4 py-6">
            <p className="text-center text-sm text-muted-foreground">
              Importing {Math.round((progress / 100) * validCount)} of {validCount}...
            </p>
            <Progress value={progress} />
          </div>
        )}

        {step === "review" && result && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border bg-green-50 p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{result.inserted}</p>
                <p className="text-xs text-green-700">Inserted</p>
              </div>
              <div className="rounded-lg border bg-blue-50 p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{result.updated}</p>
                <p className="text-xs text-blue-700">Updated</p>
              </div>
              <div className="rounded-lg border bg-red-50 p-3 text-center">
                <p className="text-2xl font-bold text-red-700">{result.failed}</p>
                <p className="text-xs text-red-700">Failed</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="max-h-40 overflow-auto rounded-lg border bg-muted/30 p-2 text-xs">
                {result.errors.map((e, i) => (
                  <div key={i} className="border-b border-border/50 py-1 last:border-0">
                    <span className="font-mono">{e.sku}</span>: <span className="text-red-600">{e.error}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-start gap-2 rounded-lg border border-secondary/30 bg-secondary/5 p-3 text-xs">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
              <p>
                Tip: Run <span className="font-semibold">AI translation</span> on imported products from{" "}
                <code>/admin/languages</code> to fill missing languages automatically.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === "template" && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={() => setStep("upload")}>Continue</Button>
            </>
          )}
          {step === "upload" && (
            <Button variant="outline" onClick={() => setStep("template")}>Back</Button>
          )}
          {step === "validate" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
              <Button onClick={startImport} disabled={validCount === 0}>
                Start import ({validCount})
              </Button>
            </>
          )}
          {step === "import" && (
            <Button disabled>{importing ? "Importing..." : "Done"}</Button>
          )}
          {step === "review" && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              <Button
                onClick={() => {
                  onComplete?.();
                  onOpenChange(false);
                }}
              >
                View imported products
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}