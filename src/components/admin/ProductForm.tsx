import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { translateProductFields } from "@/lib/translate.functions";
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

type ProductImage = {
  id: string;
  image_url: string;
  alt_text_en: string | null;
  alt_text_id: string | null;
  sort_order: number;
  is_primary: boolean;
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

type ProductFormProps =
  | { mode: "new"; productId?: undefined }
  | { mode: "edit"; productId: string };

export function ProductForm(props: ProductFormProps) {
  const { mode, productId } = props;
  const navigate = useNavigate();
  const { profile } = useAdminAuth();

  const [values, setValues] = useState<ProductFormValues>(EMPTY);
  const [initialSnapshot, setInitialSnapshot] = useState<string>(JSON.stringify(EMPTY));
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"basic" | "translations" | "images">("basic");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [skuCheck, setSkuCheck] = useState<"idle" | "checking" | "ok" | "taken">("idle");
  const [images, setImages] = useState<ProductImage[]>([]);

  // Translations tab UI state
  const [translationView, setTranslationView] = useState<"both" | "id" | "en">("both");
  const [translating, setTranslating] = useState<"to_en" | "to_id" | null>(null);
  const callTranslate = useServerFn(translateProductFields);

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
    // Images
    void supabase
      .from("product_images")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order")
      .then(({ data }) => setImages((data ?? []) as ProductImage[]));
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

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!values.sku.trim()) e.sku = "SKU is required";
    else if (!SKU_RE.test(values.sku)) e.sku = "Letters, numbers and hyphens only";
    else if (skuCheck === "taken") e.sku = "SKU is already in use";
    if (!values.category_id) e.category_id = "Category is required";
    if (!values.price_idr || values.price_idr <= 0) e.price_idr = "Price must be greater than 0";
    if (!values.name_en.trim() && !values.name_id.trim())
      e.name = "At least one language name is required";
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
                  {values.attributes.map((attr, idx) => (
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
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card title="English">
              <Field label="Name (EN)">
                <Input
                  value={values.name_en}
                  onChange={(e) => setField("name_en", e.target.value)}
                  placeholder="Centaurus 60L Carrier"
                />
              </Field>
              <Field label="Description (EN)">
                <Textarea
                  rows={8}
                  value={values.description_en}
                  onChange={(e) => setField("description_en", e.target.value)}
                  placeholder="Built for multi-day expeditions…"
                />
              </Field>
            </Card>
            <Card title="Bahasa Indonesia">
              <Field label="Nama (ID)">
                <Input
                  value={values.name_id}
                  onChange={(e) => setField("name_id", e.target.value)}
                  placeholder="Tas Carrier Centaurus 60L"
                />
              </Field>
              <Field label="Deskripsi (ID)">
                <Textarea
                  rows={8}
                  value={values.description_id}
                  onChange={(e) => setField("description_id", e.target.value)}
                  placeholder="Dirancang untuk ekspedisi…"
                />
              </Field>
            </Card>
          </div>
          {errors.name && (
            <p className="mt-3 text-sm text-destructive">{errors.name}</p>
          )}
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
            <Card title="Images">
              {images.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No images yet. Image upload UI will be added in a follow-up.
                </p>
              ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {images.map((img) => (
                    <li key={img.id} className="overflow-hidden rounded-md border border-input">
                      <img src={img.image_url} alt={img.alt_text_en ?? ""} className="aspect-square w-full object-cover" />
                      {img.is_primary && (
                        <div className="bg-primary px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                          Primary
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
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