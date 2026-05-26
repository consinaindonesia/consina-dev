import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Plus,
  Trash2,
  Loader2,
  Check,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { translateText } from "@/lib/translate.functions";
import { ProductImagesTab } from "@/components/admin/ProductImagesTab";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { useAdminAuth } from "@/hooks/use-admin-auth";

const FOREST = "#1a3a2e";

type Category = { id: string; name_en: string; sort_order: number };

type AttributeDef = {
  id: string;
  slug: string;
  name_id: string;
  name_en: string;
  type: "text" | "number" | "select";
  unit: string | null;
  options: string[];
  is_required: boolean;
};

type Attribute = { key: string; value: string };

export type ProductFormValues = {
  sku: string;
  category_id: string;
  name_en: string;
  name_id: string;
  description_en: string;
  description_id: string;
  short_description_en: string;
  short_description_id: string;
  price_idr: number;
  capacity: string;
  weight_grams: number | null;
  attributes: Attribute[];
  stock_status: "in_stock" | "low_stock" | "out_of_stock";
  is_featured: boolean;
  is_active: boolean;
};

const EMPTY: ProductFormValues = {
  sku: "",
  category_id: "",
  name_en: "",
  name_id: "",
  description_en: "",
  description_id: "",
  short_description_en: "",
  short_description_id: "",
  price_idr: 0,
  capacity: "",
  weight_grams: null,
  attributes: [],
  stock_status: "in_stock",
  is_featured: false,
  is_active: true,
};

function formatIDR(n: number) {
  if (!n) return "";
  return new Intl.NumberFormat("id-ID").format(n);
}

function parseIDR(s: string) {
  const digits = s.replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

const SKU_RE = /^[A-Za-z0-9-]+$/;

async function logActivity(
  adminId: string | null,
  action: "created" | "updated",
  productId: string,
) {
  try {
    await supabase.from("activity_log").insert({
      admin_user_id: adminId,
      action,
      entity_type: "product",
      entity_id: productId,
    });
  } catch {
    /* best-effort */
  }
}

type Tab = "basic" | "translations" | "images";
type ProductFormProps =
  | { mode: "new"; productId?: undefined; initialTab?: Tab }
  | { mode: "edit"; productId: string; initialTab?: Tab };

export function ProductForm(props: ProductFormProps) {
  const { mode, productId, initialTab } = props;
  const navigate = useNavigate();
  const { profile } = useAdminAuth();

  const [values, setValues] = useState<ProductFormValues>(EMPTY);
  const [initialSnapshot, setInitialSnapshot] = useState<string>(JSON.stringify(EMPTY));
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>(initialTab ?? "basic");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [skuCheck, setSkuCheck] = useState<"idle" | "checking" | "ok" | "taken">("idle");
  // Category-defined attribute schema + values keyed by attribute slug.
  const [categoryAttrs, setCategoryAttrs] = useState<AttributeDef[]>([]);
  const [definedAttrValues, setDefinedAttrValues] = useState<Record<string, string>>({});

  // Translations tab UI state
  const [translationView, setTranslationView] = useState<"both" | "id" | "en">("both");
  const [translating, setTranslating] = useState<"to_en" | "to_id" | null>(null);
  const [aiFlags, setAiFlags] = useState<Record<string, boolean>>({});
  const callTranslate = useServerFn(translateText);

  // Draft restore banner
  const draftKey = `product-draft:${mode === "edit" ? productId : "new"}`;
  const [draftAvailable, setDraftAvailable] = useState<ProductFormValues | null>(null);
  const [draftDismissed, setDraftDismissed] = useState(false);

  const dirty = JSON.stringify(values) !== initialSnapshot;

  // Load categories
  useEffect(() => {
    void supabase
      .from("categories")
      .select("id, name_en, sort_order")
      .order("sort_order")
      .then(({ data }) => setCategories((data ?? []) as Category[]));
  }, []);

  // Load attribute schema whenever the selected category changes
  useEffect(() => {
    if (!values.category_id) {
      setCategoryAttrs([]);
      return;
    }
    let cancelled = false;
    void supabase
      .from("category_attributes")
      .select(
        "is_required, sort_order, attribute:attributes(id, slug, name_id, name_en, type, unit, options)",
      )
      .eq("category_id", values.category_id)
      .order("sort_order")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) return;
        type Row = {
          is_required: boolean;
          attribute: {
            id: string;
            slug: string;
            name_id: string;
            name_en: string;
            type: string;
            unit: string | null;
            options: unknown;
          } | null;
        };
        const defs: AttributeDef[] = (data as unknown as Row[] | null ?? [])
          .map((row) => {
            const a = row.attribute;
            if (!a) return null;
            return {
              id: a.id,
              slug: a.slug,
              name_id: a.name_id,
              name_en: a.name_en,
              type: (a.type as AttributeDef["type"]),
              unit: a.unit,
              options: Array.isArray(a.options) ? (a.options as string[]) : [],
              is_required: row.is_required,
            };
          })
          .filter((x): x is AttributeDef => x !== null);
        setCategoryAttrs(defs);
      });
    return () => {
      cancelled = true;
    };
  }, [values.category_id]);

  // Sync defined-attribute values from `values.attributes` whenever the schema or
  // values change due to product load / category change.
  useEffect(() => {
    const map: Record<string, string> = {};
    const slugs = new Set(categoryAttrs.map((a) => a.slug));
    values.attributes.forEach((a) => {
      if (slugs.has(a.key)) map[a.key] = a.value;
    });
    setDefinedAttrValues(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryAttrs, initialSnapshot]);

  function setDefinedAttr(slug: string, value: string) {
    setDefinedAttrValues((p) => ({ ...p, [slug]: value }));
    // Mirror into values.attributes so save / dirty tracking work uniformly
    setValues((p) => {
      const idx = p.attributes.findIndex((a) => a.key === slug);
      if (idx >= 0) {
        const next = [...p.attributes];
        next[idx] = { key: slug, value };
        return { ...p, attributes: next };
      }
      return { ...p, attributes: [...p.attributes, { key: slug, value }] };
    });
  }

  // Load existing product if editing
  useEffect(() => {
    if (mode !== "edit") return;
    let cancelled = false;
    setLoading(true);
    void supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          toast.error("Product not found");
          navigate({ to: "/admin/products" });
          return;
        }
        const attrsObj = (data.attributes as Record<string, string> | null) ?? {};
        const next: ProductFormValues = {
          sku: data.sku,
          category_id: data.category_id ?? "",
          name_en: data.name_en ?? "",
          name_id: data.name_id ?? "",
          description_en: data.description_en ?? "",
          description_id: data.description_id ?? "",
          short_description_en: (data as { short_description_en?: string | null }).short_description_en ?? "",
          short_description_id: (data as { short_description_id?: string | null }).short_description_id ?? "",
          price_idr: data.price_idr ?? 0,
          capacity: data.capacity ?? "",
          weight_grams: data.weight_grams,
          attributes: Object.entries(attrsObj).map(([key, value]) => ({
            key,
            value: String(value),
          })),
          stock_status: (data.stock_status as ProductFormValues["stock_status"]) ?? "in_stock",
          is_featured: data.is_featured,
          is_active: data.is_active,
        };
        setValues(next);
        setInitialSnapshot(JSON.stringify(next));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, productId, navigate]);

  // Debounced SKU uniqueness check
  const skuTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!values.sku || !SKU_RE.test(values.sku)) {
      setSkuCheck("idle");
      return;
    }
    setSkuCheck("checking");
    if (skuTimer.current) clearTimeout(skuTimer.current);
    skuTimer.current = setTimeout(async () => {
      let q = supabase.from("products").select("id").eq("sku", values.sku);
      if (mode === "edit") q = q.neq("id", productId);
      const { data } = await q.maybeSingle();
      setSkuCheck(data ? "taken" : "ok");
    }, 400);
    return () => {
      if (skuTimer.current) clearTimeout(skuTimer.current);
    };
  }, [values.sku, mode, productId]);

  // Prevent navigation if dirty
  useBlocker({
    shouldBlockFn: () => {
      if (!dirty || saving) return false;
      return !window.confirm("You have unsaved changes. Discard them?");
    },
  });

  // Warn on tab close
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Check for an autosaved draft on mount / when loading finishes
  useEffect(() => {
    if (loading) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { savedAt: number; values: ProductFormValues };
      // Ignore drafts that match the just-loaded state
      if (JSON.stringify(parsed.values) === JSON.stringify(values)) return;
      setDraftAvailable(parsed.values);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Autosave to localStorage every 30s when dirty
  useEffect(() => {
    if (!dirty) return;
    const t = setInterval(() => {
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({ savedAt: Date.now(), values }),
        );
      } catch {
        /* ignore quota */
      }
    }, 30000);
    return () => clearInterval(t);
  }, [dirty, values, draftKey]);

  function setField<K extends keyof ProductFormValues>(k: K, v: ProductFormValues[K]) {
    setValues((p) => ({ ...p, [k]: v }));
  }

  // Wrapped setter for human edits — clears the AI-translated badge for that field.
  function setFieldByUser<K extends keyof ProductFormValues>(
    k: K,
    v: ProductFormValues[K],
  ) {
    setField(k, v);
    setAiFlags((p) => {
      if (!p[k as string]) return p;
      const next = { ...p };
      delete next[k as string];
      return next;
    });
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!values.sku.trim()) e.sku = "SKU is required";
    else if (!SKU_RE.test(values.sku)) e.sku = "Letters, numbers and hyphens only";
    else if (skuCheck === "taken") e.sku = "SKU is already in use";
    if (!values.category_id) e.category_id = "Category is required";
    if (!values.price_idr || values.price_idr <= 0) e.price_idr = "Price must be greater than 0";
    if (!values.name_en.trim() && !values.name_id.trim())
      e.name = "At least one language name is required";
    // Required category attributes
    categoryAttrs.forEach((a) => {
      if (!a.is_required) return;
      const v = (definedAttrValues[a.slug] ?? "").trim();
      if (!v) e[`attr_${a.slug}`] = `${a.name_en} is required`;
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const requiredOk = useMemo(() => {
    return (
      values.sku.trim() &&
      SKU_RE.test(values.sku) &&
      skuCheck !== "taken" &&
      values.category_id &&
      values.price_idr > 0 &&
      (values.name_en.trim() || values.name_id.trim())
    );
  }, [values, skuCheck]);

  async function save(opts: { andNew?: boolean } = {}) {
    if (!validate()) {
      toast.error("Please fix the errors before saving");
      return;
    }
    setSaving(true);

    const attrsObj: Record<string, string> = {};
    values.attributes.forEach((a) => {
      if (a.key.trim()) attrsObj[a.key.trim()] = a.value;
    });

    const payload = {
      sku: values.sku.trim(),
      category_id: values.category_id || null,
      name_en: values.name_en.trim() || values.name_id.trim(),
      name_id: values.name_id.trim() || values.name_en.trim(),
      description_en: values.description_en || null,
      description_id: values.description_id || null,
      short_description_en: values.short_description_en || null,
      short_description_id: values.short_description_id || null,
      price_idr: values.price_idr,
      capacity: values.capacity || null,
      weight_grams: values.weight_grams,
      attributes: attrsObj,
      stock_status: values.stock_status,
      is_featured: values.is_featured,
      is_active: values.is_active,
    };

    if (mode === "new") {
      const { data, error } = await supabase
        .from("products")
        .insert(payload)
        .select("id")
        .single();
      setSaving(false);
      if (error || !data) {
        toast.error(error?.message ?? "Save failed");
        return;
      }
      void logActivity(profile?.id ?? null, "created", data.id);
      toast.success("Product created");
      setInitialSnapshot(JSON.stringify(values));
      try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
      if (opts.andNew) {
        setValues(EMPTY);
        setInitialSnapshot(JSON.stringify(EMPTY));
        setErrors({});
        setTab("basic");
      } else {
        navigate({ to: "/admin/products/$id/edit", params: { id: data.id } });
      }
    } else {
      const { error } = await supabase
        .from("products")
        .update(payload)
        .eq("id", productId);
      setSaving(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      void logActivity(profile?.id ?? null, "updated", productId);
      toast.success("Product saved");
      setInitialSnapshot(JSON.stringify(values));
      try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
      if (opts.andNew) {
        navigate({ to: "/admin/products/new" });
      }
    }
  }

  const title =
    mode === "new"
      ? "New Product"
      : `Edit: ${values.name_en || values.name_id || "Loading…"}`;

  if (loading) {
    return (
      <AdminShell>
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading product…
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      {/* Breadcrumb + heading */}
      <div className="mb-6">
        <nav className="text-xs text-muted-foreground">
          <Link to="/admin" className="hover:text-foreground">Dashboard</Link>
          <span className="mx-1.5">/</span>
          <Link to="/admin/products" className="hover:text-foreground">Products</Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">{title}</span>
        </nav>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{title}</h1>
      </div>

      {draftAvailable && !draftDismissed && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-900">
            We saved a draft from your last session. Restore it?
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
                setDraftAvailable(null);
                setDraftDismissed(true);
              }}
            >
              Discard
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setValues(draftAvailable);
                setDraftAvailable(null);
                setDraftDismissed(true);
                toast.success("Draft restored");
              }}
            >
              Restore draft
            </Button>
            <button
              type="button"
              onClick={() => {
                setDraftAvailable(null);
                setDraftDismissed(true);
              }}
              className="text-amber-900/60 hover:text-amber-900"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="translations">Translations</TabsTrigger>
          <TabsTrigger value="images" disabled={mode === "new"}>
            Images
          </TabsTrigger>
        </TabsList>

        {/* BASIC INFO */}
        <TabsContent value="basic" className="pb-32">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* LEFT: Identity */}
            <Card title="Product Identity">
              <Field label="SKU" required error={errors.sku}>
                <div className="relative">
                  <Input
                    value={values.sku}
                    onChange={(e) => setField("sku", e.target.value.toUpperCase())}
                    placeholder="CRR-CEN-60"
                    className="font-mono pr-8"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    {skuCheck === "checking" && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {skuCheck === "ok" && <Check className="h-4 w-4 text-green-600" />}
                    {skuCheck === "taken" && <AlertCircle className="h-4 w-4 text-destructive" />}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  e.g., CRR-CEN-60 (Category-Product-Variant)
                </p>
              </Field>

              <Field label="Category" required error={errors.category_id}>
                <Select
                  value={values.category_id}
                  onValueChange={(v) => setField("category_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Capacity">
                <Input
                  value={values.capacity}
                  onChange={(e) => setField("capacity", e.target.value)}
                  placeholder="60L"
                />
              </Field>

              <Field label="Weight (grams)">
                <Input
                  type="number"
                  min={0}
                  value={values.weight_grams ?? ""}
                  onChange={(e) =>
                    setField("weight_grams", e.target.value ? parseInt(e.target.value, 10) : null)
                  }
                  placeholder="1500"
                />
              </Field>

              <Field label="Attributes">
                <div className="space-y-2">
                  {/* Category-defined attributes */}
                  {categoryAttrs.length > 0 && (
                    <div className="mb-3 space-y-3 rounded-lg border border-input bg-muted/30 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {categories.find((c) => c.id === values.category_id)?.name_en} specs
                      </p>
                      {categoryAttrs.map((a) => {
                        const id = `attr-${a.slug}`;
                        const val = definedAttrValues[a.slug] ?? "";
                        const err = errors[`attr_${a.slug}`];
                        return (
                          <div key={a.id} className="space-y-1">
                            <Label htmlFor={id} className="text-sm">
                              {a.name_en}
                              {a.unit ? ` (${a.unit})` : ""}
                              {a.is_required && <span className="ml-1 text-destructive">*</span>}
                            </Label>
                            {a.type === "select" ? (
                              <Select
                                value={val}
                                onValueChange={(v) => setDefinedAttr(a.slug, v)}
                              >
                                <SelectTrigger id={id}>
                                  <SelectValue placeholder="Choose…" />
                                </SelectTrigger>
                                <SelectContent>
                                  {a.options.map((opt) => (
                                    <SelectItem key={opt} value={opt}>
                                      {opt}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                id={id}
                                type={a.type === "number" ? "number" : "text"}
                                value={val}
                                onChange={(e) => setDefinedAttr(a.slug, e.target.value)}
                                placeholder={a.name_id !== a.name_en ? a.name_id : ""}
                              />
                            )}
                            {err && <p className="text-xs text-destructive">{err}</p>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {categoryAttrs.length > 0 && (
                    <p className="text-xs text-muted-foreground">Custom attributes (extra key/value pairs)</p>
                  )}
                  {values.attributes.map((attr, idx) => (
                    // Hide rows whose key matches a category-defined attribute (rendered above)
                    categoryAttrs.some((d) => d.slug === attr.key) ? null : (
                    <div key={idx} className="flex gap-2">
                      <Input
                        placeholder="Key (e.g. Material)"
                        value={attr.key}
                        onChange={(e) =>
                          setValues((p) => ({
                            ...p,
                            attributes: p.attributes.map((a, i) =>
                              i === idx ? { ...a, key: e.target.value } : a,
                            ),
                          }))
                        }
                      />
                      <Input
                        placeholder="Value (e.g. Polyester 600D)"
                        value={attr.value}
                        onChange={(e) =>
                          setValues((p) => ({
                            ...p,
                            attributes: p.attributes.map((a, i) =>
                              i === idx ? { ...a, value: e.target.value } : a,
                            ),
                          }))
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setValues((p) => ({
                            ...p,
                            attributes: p.attributes.filter((_, i) => i !== idx),
                          }))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    )
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setValues((p) => ({
                        ...p,
                        attributes: [...p.attributes, { key: "", value: "" }],
                      }))
                    }
                  >
                    <Plus className="h-4 w-4" /> Add attribute
                  </Button>
                </div>
              </Field>
            </Card>

            {/* RIGHT: Pricing & Status */}
            <Card title="Pricing & Status">
              <Field label="Price (IDR)" required error={errors.price_idr}>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    Rp
                  </span>
                  <Input
                    inputMode="numeric"
                    value={formatIDR(values.price_idr)}
                    onChange={(e) => setField("price_idr", parseIDR(e.target.value))}
                    placeholder="1.850.000"
                    className="pl-10"
                  />
                </div>
              </Field>

              <Field label="Stock Status">
                <Select
                  value={values.stock_status}
                  onValueChange={(v) =>
                    setField("stock_status", v as ProductFormValues["stock_status"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_stock">In Stock</SelectItem>
                    <SelectItem value="low_stock">Low Stock</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <div className="flex items-center gap-2 pt-2">
                <Checkbox
                  id="featured"
                  checked={values.is_featured}
                  onCheckedChange={(c) => setField("is_featured", c === true)}
                />
                <Label htmlFor="featured" className="cursor-pointer">
                  Featured product
                </Label>
                <span className="text-xs text-muted-foreground">
                  — shows on homepage featured section
                </span>
              </div>

              <div className="flex items-center justify-between rounded-md border border-input p-3">
                <div>
                  <Label htmlFor="active" className="cursor-pointer">Active</Label>
                  <p className="text-xs text-muted-foreground">
                    When off, hides product from the public site
                  </p>
                </div>
                <Switch
                  id="active"
                  checked={values.is_active}
                  onCheckedChange={(c) => setField("is_active", c)}
                />
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* TRANSLATIONS */}
        <TabsContent value="translations" className="pb-32">
          <TranslationsTab
            values={values}
            setField={setFieldByUser}
            aiFlags={aiFlags}
            error={errors.name}
            view={translationView}
            setView={setTranslationView}
            translating={translating}
            onTranslate={async (direction) => {
              setTranslating(direction);
              try {
                const sourceLang = direction === "to_en" ? "id" : "en";
                const targetLang = direction === "to_en" ? "en" : "id";
                const fields = [
                  {
                    contentType: "name" as const,
                    source: direction === "to_en" ? values.name_id : values.name_en,
                    targetKey: (direction === "to_en" ? "name_en" : "name_id") as keyof ProductFormValues,
                  },
                  {
                    contentType: "short_description" as const,
                    source:
                      direction === "to_en"
                        ? values.short_description_id
                        : values.short_description_en,
                    targetKey: (direction === "to_en"
                      ? "short_description_en"
                      : "short_description_id") as keyof ProductFormValues,
                  },
                  {
                    contentType: "description" as const,
                    source:
                      direction === "to_en"
                        ? values.description_id
                        : values.description_en,
                    targetKey: (direction === "to_en"
                      ? "description_en"
                      : "description_id") as keyof ProductFormValues,
                  },
                ];
                let translated = 0;
                const newFlags: Record<string, boolean> = {};
                for (const f of fields) {
                  const text = (f.source ?? "").trim();
                  if (!text) continue;
                  const out = await callTranslate({
                    data: {
                      sourceText: f.source,
                      sourceLang,
                      targetLang,
                      contentType: f.contentType,
                      productId: mode === "edit" ? productId : null,
                    },
                  });
                  setField(f.targetKey, out.translation as ProductFormValues[typeof f.targetKey]);
                  newFlags[f.targetKey as string] = true;
                  translated++;
                }
                if (translated === 0) {
                  toast.error("Nothing to translate — fill in the source language first.");
                } else {
                  setAiFlags((p) => ({ ...p, ...newFlags }));
                  toast.success(`Translated ${translated} field${translated === 1 ? "" : "s"} — please review`);
                }
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Translation failed");
              } finally {
                setTranslating(null);
              }
            }}
          />
        </TabsContent>

        {/* IMAGES */}
        <TabsContent value="images" className="pb-32">
          {mode === "new" ? (
            <Card title="Images">
              <p className="text-sm text-muted-foreground">
                Save the product first, then come back to add images.
              </p>
            </Card>
          ) : (
            <ProductImagesTab productId={productId} sku={values.sku} />
          )}
        </TabsContent>
      </Tabs>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-white px-4 py-3 shadow-lg lg:left-[240px]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {dirty ? "Unsaved changes" : "All changes saved"}
          </div>
          <div className="flex items-center gap-2">
            <CancelLink dirty={dirty} />
            <Button
              variant="outline"
              disabled={!requiredOk || saving}
              onClick={() => void save({ andNew: true })}
            >
              Save & new
            </Button>
            <Button
              disabled={!requiredOk || saving}
              onClick={() => void save()}
              style={{ backgroundColor: FOREST }}
              className="text-white hover:opacity-90"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function CancelLink({ dirty }: { dirty: boolean }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const go = () => navigate({ to: "/admin/products" });
  return (
    <>
      <Button
        variant="ghost"
        onClick={() => {
          if (dirty) setOpen(true);
          else go();
        }}
      >
        Cancel
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Discard them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={go}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const SHORT_MAX = 160;

function LangColumn({
  lang,
  values,
  setField,
  tint,
  aiFlags,
}: {
  lang: "id" | "en";
  values: ProductFormValues;
  setField: <K extends keyof ProductFormValues>(k: K, v: ProductFormValues[K]) => void;
  tint: string;
  aiFlags: Record<string, boolean>;
}) {
  const isID = lang === "id";
  const nameKey = isID ? "name_id" : "name_en";
  const shortKey = isID ? "short_description_id" : "short_description_en";
  const descKey = isID ? "description_id" : "description_en";
  const shortVal = values[shortKey];
  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: tint }}>
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg" aria-hidden>
          {isID ? "🇮🇩" : "🇬🇧"}
        </span>
        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
          {isID ? "Indonesian (ID)" : "English (EN)"}
        </h3>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label>Product Name</Label>
            {aiFlags[nameKey] && <AiBadge />}
          </div>
          <Input
            value={values[nameKey]}
            onChange={(e) => setField(nameKey, e.target.value)}
            placeholder={isID ? "Tas Carrier Centaurus 60L" : "Centaurus 60L Carrier"}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label>Short Description</Label>
              {aiFlags[shortKey] && <AiBadge />}
            </div>
            <span
              className={
                shortVal.length > SHORT_MAX
                  ? "text-xs text-destructive"
                  : "text-xs text-muted-foreground"
              }
            >
              {shortVal.length} / {SHORT_MAX}
            </span>
          </div>
          <Textarea
            rows={2}
            maxLength={SHORT_MAX}
            value={shortVal}
            onChange={(e) => setField(shortKey, e.target.value)}
            placeholder={
              isID
                ? "Ringkasan singkat untuk daftar produk…"
                : "One-line summary for product list and meta description…"
            }
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label>Full Description</Label>
            {aiFlags[descKey] && <AiBadge />}
          </div>
          <RichTextEditor
            value={values[descKey]}
            onChange={(html) => setField(descKey, html)}
            placeholder={
              isID ? "Dirancang untuk ekspedisi…" : "Built for multi-day expeditions…"
            }
          />
        </div>
      </div>
    </div>
  );
}

function AiBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-700">
      <Sparkles className="h-2.5 w-2.5" />
      AI-translated
    </span>
  );
}

function TranslationsTab({
  values,
  setField,
  aiFlags,
  error,
  view,
  setView,
  translating,
  onTranslate,
}: {
  values: ProductFormValues;
  setField: <K extends keyof ProductFormValues>(k: K, v: ProductFormValues[K]) => void;
  aiFlags: Record<string, boolean>;
  error?: string;
  view: "both" | "id" | "en";
  setView: (v: "both" | "id" | "en") => void;
  translating: "to_en" | "to_id" | null;
  onTranslate: (direction: "to_en" | "to_id") => void;
}) {
  const idHasContent = !!(values.name_id || values.description_id || values.short_description_id);
  const enHasContent = !!(values.name_en || values.description_en || values.short_description_en);
  const enMissing = idHasContent && !enHasContent;
  const idMissing = enHasContent && !idHasContent;

  const bothEmpty = !values.name_id.trim() && !values.name_en.trim();
  const oneNameMissing =
    !bothEmpty && (!values.name_id.trim() || !values.name_en.trim());

  return (
    <div className="space-y-4">
      {/* Top controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          <Sparkles className="mr-1 inline h-3 w-3" />
          AI translations are suggestions — always review before publishing.
        </p>
        <div className="inline-flex items-center rounded-md border border-input bg-white p-0.5 text-xs">
          {(["both", "id", "en"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={
                "rounded px-2.5 py-1 font-medium transition-colors " +
                (view === v
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {v === "both" ? "Show both" : v === "id" ? "ID only" : "EN only"}
            </button>
          ))}
        </div>
      </div>

      {/* Warnings */}
      {(enMissing || idMissing) && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {enMissing
            ? "English description is missing — this product won't appear correctly on the English site."
            : "Indonesian description is missing — this product won't appear correctly on the Indonesian site."}
        </div>
      )}
      {oneNameMissing && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          One product name is missing. Save is still allowed, but both languages are recommended.
        </div>
      )}
      {bothEmpty && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-2 text-sm text-destructive">
          At least one product name is required.
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Columns */}
      <div
        className={
          "grid gap-0 " +
          (view === "both" ? "md:grid-cols-[1fr_auto_1fr]" : "grid-cols-1")
        }
      >
        {view !== "en" && (
          <LangColumn
            lang="id"
            values={values}
            setField={setField}
            tint="rgba(239, 246, 244, 0.6)"
            aiFlags={aiFlags}
          />
        )}
        {view === "both" && (
          <div className="mx-3 hidden w-px self-stretch bg-border md:block" />
        )}
        {view !== "id" && (
          <LangColumn
            lang="en"
            values={values}
            setField={setField}
            tint="rgba(243, 244, 246, 0.6)"
            aiFlags={aiFlags}
          />
        )}
      </div>

      {/* AI assist buttons */}
      {view === "both" && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={translating !== null || !idHasContent}
            onClick={() => onTranslate("to_en")}
          >
            {translating === "to_en" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Translate from Indonesian
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={translating !== null || !enHasContent}
            onClick={() => onTranslate("to_id")}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {translating === "to_id" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Translate from English
          </Button>
        </div>
      )}
    </div>
  );
}