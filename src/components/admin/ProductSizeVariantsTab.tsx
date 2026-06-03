import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Trash2, Upload, Ruler } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BUCKET = "product-images";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

// ---------- Staged types (used in `new` mode before product exists) ----------

export type StagedOptionType = {
  tmpId: string;
  name: string;
  values: Array<{ tmpId: string; value: string }>;
};

export type StagedSizeVariant = {
  tmpId: string;
  // Each entry references the tmpId of a value in StagedOptionType.values
  option_value_tmp_ids: string[];
  sku: string | null;
  price_idr: number | null;
  original_price_idr: number | null;
  stock: number;
  image_url: string | null;
};

export type StagedSizeData = {
  option_types: StagedOptionType[];
  variants: StagedSizeVariant[];
};

// ---------- Persisted types ----------

type DbOptionType = { id: string; product_id: string; name: string; sort_order: number };
type DbOptionValue = { id: string; option_type_id: string; value: string; sort_order: number };
type DbSizeVariant = {
  id: string;
  product_id: string;
  option_value_ids: string[];
  sku: string | null;
  price_idr: number | null;
  original_price_idr: number | null;
  stock: number;
  image_url: string | null;
  sort_order: number;
};

function tmp() {
  return "tmp-" + Math.random().toString(36).slice(2, 10);
}

function cartesian<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [];
  return arrays.reduce<T[][]>(
    (acc, curr) => acc.flatMap((a) => curr.map((c) => [...a, c])),
    [[]],
  );
}

export function ProductSizeVariantsTab({
  productId,
  sku,
  staged,
  onStagedChange,
}: {
  productId: string | null;
  sku: string;
  staged?: StagedSizeData;
  onStagedChange?: (data: StagedSizeData) => void;
}) {
  const stagedMode = productId === null;
  const [optionTypes, setOptionTypes] = useState<StagedOptionType[]>(
    () => staged?.option_types ?? [],
  );
  const [variants, setVariants] = useState<StagedSizeVariant[]>(
    () => staged?.variants ?? [],
  );
  const [loading, setLoading] = useState(!stagedMode);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // -- helpers --
  const valueMap = useMemo(() => {
    const m = new Map<string, { value: string; typeName: string }>();
    optionTypes.forEach((t) => {
      t.values.forEach((v) =>
        m.set(v.tmpId, { value: v.value, typeName: t.name }),
      );
    });
    return m;
  }, [optionTypes]);

  const emitStaged = useCallback(
    (types: StagedOptionType[], vars: StagedSizeVariant[]) => {
      if (stagedMode && onStagedChange) {
        onStagedChange({ option_types: types, variants: vars });
      }
    },
    [stagedMode, onStagedChange],
  );

  // -- load from DB --
  const refresh = useCallback(async () => {
    if (stagedMode || !productId) return;
    setLoading(true);
    const [{ data: typesData }, { data: valuesData }, { data: varsData }] =
      await Promise.all([
        supabase
          .from("product_option_types" as never)
          .select("*")
          .eq("product_id", productId)
          .order("sort_order"),
        supabase
          .from("product_option_values" as never)
          .select("*"),
        supabase
          .from("product_size_variants" as never)
          .select("*")
          .eq("product_id", productId)
          .order("sort_order"),
      ]);
    const types = (typesData ?? []) as unknown as DbOptionType[];
    const allValues = (valuesData ?? []) as unknown as DbOptionValue[];
    const vars = (varsData ?? []) as unknown as DbSizeVariant[];

    // Filter values to only those whose type belongs to this product.
    const typeIds = new Set(types.map((t) => t.id));
    const filteredValues = allValues.filter((v) => typeIds.has(v.option_type_id));

    // For DB-loaded data: we use the real DB ids as tmpId, so generated
    // variants reference them via option_value_ids.
    const mappedTypes: StagedOptionType[] = types.map((t) => ({
      tmpId: t.id,
      name: t.name,
      values: filteredValues
        .filter((v) => v.option_type_id === t.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((v) => ({ tmpId: v.id, value: v.value })),
    }));

    const mappedVars: StagedSizeVariant[] = vars.map((v) => ({
      tmpId: v.id,
      option_value_tmp_ids: v.option_value_ids,
      sku: v.sku,
      price_idr: v.price_idr,
      original_price_idr: v.original_price_idr,
      stock: v.stock,
      image_url: v.image_url,
    }));

    setOptionTypes(mappedTypes);
    setVariants(mappedVars);
    setLoading(false);
  }, [productId, stagedMode]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // -- option type editing --
  function addOptionType() {
    const next = [
      ...optionTypes,
      { tmpId: tmp(), name: "", values: [] },
    ];
    setOptionTypes(next);
    emitStaged(next, variants);
  }
  function updateOptionType(id: string, patch: Partial<StagedOptionType>) {
    const next = optionTypes.map((t) => (t.tmpId === id ? { ...t, ...patch } : t));
    setOptionTypes(next);
    emitStaged(next, variants);
  }
  function deleteOptionType(id: string) {
    const removedValueIds = new Set(
      optionTypes.find((t) => t.tmpId === id)?.values.map((v) => v.tmpId) ?? [],
    );
    const next = optionTypes.filter((t) => t.tmpId !== id);
    const nextVars = variants.filter((v) =>
      v.option_value_tmp_ids.every((id) => !removedValueIds.has(id)),
    );
    setOptionTypes(next);
    setVariants(nextVars);
    emitStaged(next, nextVars);
  }
  function addOptionValue(typeId: string) {
    updateOptionType(typeId, {
      values: [
        ...(optionTypes.find((t) => t.tmpId === typeId)?.values ?? []),
        { tmpId: tmp(), value: "" },
      ],
    });
  }
  function updateOptionValue(typeId: string, valueId: string, value: string) {
    const t = optionTypes.find((x) => x.tmpId === typeId);
    if (!t) return;
    updateOptionType(typeId, {
      values: t.values.map((v) => (v.tmpId === valueId ? { ...v, value } : v)),
    });
  }
  function deleteOptionValue(typeId: string, valueId: string) {
    const t = optionTypes.find((x) => x.tmpId === typeId);
    if (!t) return;
    const nextValues = t.values.filter((v) => v.tmpId !== valueId);
    const nextTypes = optionTypes.map((x) =>
      x.tmpId === typeId ? { ...x, values: nextValues } : x,
    );
    const nextVars = variants.filter(
      (v) => !v.option_value_tmp_ids.includes(valueId),
    );
    setOptionTypes(nextTypes);
    setVariants(nextVars);
    emitStaged(nextTypes, nextVars);
  }

  // -- combinations --
  function generateCombinations() {
    const groups = optionTypes
      .filter((t) => t.values.length > 0)
      .map((t) => t.values.map((v) => v.tmpId));
    if (groups.length === 0) {
      toast.error("Add at least one option type with values first");
      return;
    }
    const combos = cartesian(groups);
    const existingKeys = new Set(
      variants.map((v) => [...v.option_value_tmp_ids].sort().join("|")),
    );
    const additions: StagedSizeVariant[] = [];
    combos.forEach((combo) => {
      const key = [...combo].sort().join("|");
      if (existingKeys.has(key)) return;
      additions.push({
        tmpId: tmp(),
        option_value_tmp_ids: combo,
        sku: null,
        price_idr: null,
        original_price_idr: null,
        stock: 0,
        image_url: null,
      });
    });
    if (additions.length === 0) {
      toast.info("All combinations already exist");
      return;
    }
    const next = [...variants, ...additions];
    setVariants(next);
    emitStaged(optionTypes, next);
    toast.success(`Added ${additions.length} combination${additions.length === 1 ? "" : "s"}`);
  }

  function patchVariant(id: string, patch: Partial<StagedSizeVariant>) {
    const next = variants.map((v) => (v.tmpId === id ? { ...v, ...patch } : v));
    setVariants(next);
    emitStaged(optionTypes, next);
  }

  function deleteVariant(id: string) {
    const next = variants.filter((v) => v.tmpId !== id);
    setVariants(next);
    emitStaged(optionTypes, next);
  }

  async function uploadImage(variantId: string, file: File) {
    if (!ALLOWED.has(file.type)) {
      toast.error("Use JPG, PNG, or WebP");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image exceeds 5 MB");
      return;
    }
    setUploadingId(variantId);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const safe = sku.replace(/[^A-Za-z0-9_-]/g, "_") || productId || "new";
      const path = `${safe}/sizes/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) {
        toast.error(error.message);
        return;
      }
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      patchVariant(variantId, { image_url: data.publicUrl });
    } finally {
      setUploadingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading size variants…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Option types editor */}
      <section className="rounded-xl border border-input bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Option types
          </h3>
          <Button type="button" variant="outline" size="sm" onClick={addOptionType}>
            <Plus className="mr-1 h-4 w-4" /> Add option type
          </Button>
        </div>
        {optionTypes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No option types yet. Add one like "Ukuran" with values "S, M, L, XL".
          </p>
        ) : (
          <ul className="space-y-4">
            {optionTypes.map((t) => (
              <li key={t.tmpId} className="rounded-lg border border-input p-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={t.name}
                    onChange={(e) => updateOptionType(t.tmpId, { name: e.target.value })}
                    placeholder="Ukuran"
                    className="max-w-xs"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteOptionType(t.tmpId)}
                    aria-label="Delete option type"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {t.values.map((v) => (
                    <div
                      key={v.tmpId}
                      className="inline-flex items-center gap-1 rounded-md border border-input bg-muted/40 px-2 py-1"
                    >
                      <input
                        value={v.value}
                        onChange={(e) =>
                          updateOptionValue(t.tmpId, v.tmpId, e.target.value)
                        }
                        placeholder="S"
                        className="w-16 bg-transparent text-sm focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => deleteOptionValue(t.tmpId, v.tmpId)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Remove value"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => addOptionValue(t.tmpId)}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add value
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Variants table */}
      <section className="rounded-xl border border-input bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Variants ({variants.length})
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={generateCombinations}
            disabled={optionTypes.every((t) => t.values.length === 0)}
          >
            <Ruler className="mr-1 h-4 w-4" /> Generate combinations
          </Button>
        </div>
        {variants.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No variants yet. Define option types above, then generate combinations.
          </p>
        ) : (
          <ul className="space-y-3">
            {variants.map((v) => {
              const labels = v.option_value_tmp_ids
                .map((id) => valueMap.get(id))
                .filter((x): x is { value: string; typeName: string } => !!x)
                .map((x) => `${x.typeName}: ${x.value}`)
                .join(" / ");
              return (
                <SizeVariantRow
                  key={v.tmpId}
                  variant={v}
                  label={labels || "(orphan)"}
                  uploading={uploadingId === v.tmpId}
                  onPatch={(p) => patchVariant(v.tmpId, p)}
                  onDelete={() => deleteVariant(v.tmpId)}
                  onUpload={(f) => void uploadImage(v.tmpId, f)}
                />
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function SizeVariantRow({
  variant,
  label,
  uploading,
  onPatch,
  onDelete,
  onUpload,
}: {
  variant: StagedSizeVariant;
  label: string;
  uploading: boolean;
  onPatch: (p: Partial<StagedSizeVariant>) => void;
  onDelete: () => void;
  onUpload: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  return (
    <li className="rounded-lg border border-input p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDelete}
          aria-label="Delete variant"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_140px_140px_100px_140px]">
        <div className="space-y-1">
          <Label className="text-xs">SKU</Label>
          <Input
            value={variant.sku ?? ""}
            onChange={(e) => onPatch({ sku: e.target.value || null })}
            placeholder="—"
            className="font-mono"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Price (IDR)</Label>
          <Input
            type="number"
            min={0}
            value={variant.price_idr ?? ""}
            onChange={(e) =>
              onPatch({
                price_idr: e.target.value === "" ? null : Math.max(0, parseInt(e.target.value, 10) || 0),
              })
            }
            placeholder="—"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Original (IDR)</Label>
          <Input
            type="number"
            min={0}
            value={variant.original_price_idr ?? ""}
            onChange={(e) =>
              onPatch({
                original_price_idr:
                  e.target.value === "" ? null : Math.max(0, parseInt(e.target.value, 10) || 0),
              })
            }
            placeholder="—"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Stock</Label>
          <Input
            type="number"
            min={0}
            value={variant.stock}
            onChange={(e) =>
              onPatch({ stock: Math.max(0, parseInt(e.target.value, 10) || 0) })
            }
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Image</Label>
          <div className="flex items-center gap-2">
            {variant.image_url ? (
              <img
                src={variant.image_url}
                alt=""
                className="h-9 w-9 rounded border border-input object-cover"
              />
            ) : (
              <div className="h-9 w-9 rounded border border-dashed border-input" />
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(f);
                if (fileRef.current) fileRef.current.value = "";
              }}
            />
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * Persist staged option types/values/variants for a freshly-created product.
 * Returns true on success.
 */
export async function persistSizeData(
  productId: string,
  data: StagedSizeData,
): Promise<boolean> {
  if (data.option_types.length === 0 && data.variants.length === 0) return true;
  // Insert option types
  const typesPayload = data.option_types
    .filter((t) => t.name.trim())
    .map((t, i) => ({ product_id: productId, name: t.name.trim(), sort_order: i }));
  const { data: insertedTypes, error: tErr } = await supabase
    .from("product_option_types" as never)
    .insert(typesPayload as never)
    .select("id");
  if (tErr) {
    toast.error("Saved product, but option types failed: " + tErr.message);
    return false;
  }
  const dbTypes = (insertedTypes ?? []) as unknown as Array<{ id: string }>;
  // Map tmpId -> dbId for types
  const tmpTypeIdToDb = new Map<string, string>();
  data.option_types
    .filter((t) => t.name.trim())
    .forEach((t, i) => {
      const dbId = dbTypes[i]?.id;
      if (dbId) tmpTypeIdToDb.set(t.tmpId, dbId);
    });

  // Insert values
  const valuePayload: Array<{
    option_type_id: string;
    value: string;
    sort_order: number;
    tmpId: string;
  }> = [];
  data.option_types.forEach((t) => {
    const dbTypeId = tmpTypeIdToDb.get(t.tmpId);
    if (!dbTypeId) return;
    t.values
      .filter((v) => v.value.trim())
      .forEach((v, i) =>
        valuePayload.push({
          option_type_id: dbTypeId,
          value: v.value.trim(),
          sort_order: i,
          tmpId: v.tmpId,
        }),
      );
  });
  const tmpValueIdToDb = new Map<string, string>();
  if (valuePayload.length > 0) {
    const { data: insertedValues, error: vErr } = await supabase
      .from("product_option_values" as never)
      .insert(
        valuePayload.map(({ option_type_id, value, sort_order }) => ({
          option_type_id,
          value,
          sort_order,
        })) as never,
      )
      .select("id");
    if (vErr) {
      toast.error("Saved product, but option values failed: " + vErr.message);
      return false;
    }
    const dbVals = (insertedValues ?? []) as unknown as Array<{ id: string }>;
    valuePayload.forEach((p, i) => {
      const dbId = dbVals[i]?.id;
      if (dbId) tmpValueIdToDb.set(p.tmpId, dbId);
    });
  }

  // Insert variants
  if (data.variants.length > 0) {
    const varPayload = data.variants.map((v, i) => ({
      product_id: productId,
      option_value_ids: v.option_value_tmp_ids
        .map((id) => tmpValueIdToDb.get(id))
        .filter((x): x is string => !!x),
      sku: v.sku,
      price_idr: v.price_idr,
      original_price_idr: v.original_price_idr,
      stock: v.stock,
      image_url: v.image_url,
      sort_order: i,
    }));
    const { error: svErr } = await supabase
      .from("product_size_variants" as never)
      .insert(varPayload as never);
    if (svErr) {
      toast.error("Saved product, but size variants failed: " + svErr.message);
      return false;
    }
  }
  return true;
}