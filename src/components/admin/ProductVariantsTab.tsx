import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2, Upload, Palette } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BUCKET = "product-images";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const HEX_RE = /^#[0-9a-f]{6}$/i;

type Variant = {
  id: string;
  product_id: string;
  color_name: string;
  color_hex: string;
  image_url: string | null;
  stock: number | null;
  sort_order: number;
};

function tmpId() {
  return "tmp-" + Math.random().toString(36).slice(2, 10);
}

export function ProductVariantsTab({
  productId,
  sku,
}: {
  productId: string;
  sku: string;
}) {
  const [rows, setRows] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order");
    if (error) {
      toast.error(error.message);
    } else {
      setRows((data ?? []) as Variant[]);
    }
    setLoading(false);
  }, [productId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function patchRow(id: string, patch: Partial<Variant>) {
    setRows((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    const nextOrder = rows.length;
    setRows((p) => [
      ...p,
      {
        id: tmpId(),
        product_id: productId,
        color_name: "",
        color_hex: "#000000",
        image_url: null,
        stock: null,
        sort_order: nextOrder,
      },
    ]);
  }

  async function saveRow(row: Variant) {
    if (!row.color_name.trim()) {
      toast.error("Color name is required");
      return;
    }
    if (!HEX_RE.test(row.color_hex)) {
      toast.error("Color hex must be like #1a1a1a");
      return;
    }
    setSavingId(row.id);
    const payload = {
      product_id: productId,
      color_name: row.color_name.trim(),
      color_hex: row.color_hex.toLowerCase(),
      image_url: row.image_url,
      stock: row.stock,
      sort_order: row.sort_order,
    };
    if (row.id.startsWith("tmp-")) {
      const { data, error } = await supabase
        .from("product_variants")
        .insert(payload)
        .select()
        .single();
      setSavingId(null);
      if (error || !data) {
        toast.error(error?.message ?? "Save failed");
        return;
      }
      setRows((p) => p.map((r) => (r.id === row.id ? (data as Variant) : r)));
      toast.success("Color added");
    } else {
      const { error } = await supabase
        .from("product_variants")
        .update(payload)
        .eq("id", row.id);
      setSavingId(null);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Color saved");
    }
  }

  async function deleteRow(row: Variant) {
    if (!confirm(`Delete color "${row.color_name || "(unnamed)"}"?`)) return;
    if (row.id.startsWith("tmp-")) {
      setRows((p) => p.filter((r) => r.id !== row.id));
      return;
    }
    const { error } = await supabase
      .from("product_variants")
      .delete()
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((p) => p.filter((r) => r.id !== row.id));
    toast.success("Color deleted");
  }

  async function moveRow(row: Variant, dir: -1 | 1) {
    const idx = rows.findIndex((r) => r.id === row.id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[idx], next[j]] = [next[j], next[idx]];
    const reseq = next.map((r, i) => ({ ...r, sort_order: i }));
    setRows(reseq);
    // Persist sort_order for any saved (non-tmp) rows
    const updates = reseq
      .filter((r) => !r.id.startsWith("tmp-"))
      .map((r) =>
        supabase
          .from("product_variants")
          .update({ sort_order: r.sort_order })
          .eq("id", r.id),
      );
    const results = await Promise.all(updates);
    const err = results.find((r) => r.error);
    if (err?.error) {
      toast.error("Reorder failed: " + err.error.message);
      void refresh();
    }
  }

  async function uploadImage(row: Variant, file: File) {
    if (!ALLOWED.has(file.type)) {
      toast.error("Use JPG, PNG, or WebP");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image exceeds 5 MB");
      return;
    }
    setUploadingId(row.id);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const safe = sku.replace(/[^A-Za-z0-9_-]/g, "_") || productId;
      const path = `${safe}/variants/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) {
        toast.error(upErr.message);
        return;
      }
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      patchRow(row.id, { image_url: data.publicUrl });
    } finally {
      setUploadingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading variants…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-input py-12 text-muted-foreground">
          <Palette className="h-8 w-8" aria-hidden />
          <p className="text-sm">No color variants yet. Add one to let customers pick a color.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row, idx) => (
            <VariantRow
              key={row.id}
              row={row}
              isFirst={idx === 0}
              isLast={idx === rows.length - 1}
              saving={savingId === row.id}
              uploading={uploadingId === row.id}
              onPatch={(p) => patchRow(row.id, p)}
              onSave={() => void saveRow(row)}
              onDelete={() => void deleteRow(row)}
              onMoveUp={() => void moveRow(row, -1)}
              onMoveDown={() => void moveRow(row, 1)}
              onUpload={(file) => void uploadImage(row, file)}
            />
          ))}
        </ul>
      )}
      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <Plus className="mr-1 h-4 w-4" /> Add color
      </Button>
    </div>
  );
}

function VariantRow({
  row,
  isFirst,
  isLast,
  saving,
  uploading,
  onPatch,
  onSave,
  onDelete,
  onMoveUp,
  onMoveDown,
  onUpload,
}: {
  row: Variant;
  isFirst: boolean;
  isLast: boolean;
  saving: boolean;
  uploading: boolean;
  onPatch: (p: Partial<Variant>) => void;
  onSave: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUpload: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const isNew = row.id.startsWith("tmp-");
  return (
    <li className="rounded-lg border border-input bg-white p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_120px_88px_auto]">
        <div className="space-y-1">
          <Label className="text-xs">Color name</Label>
          <Input
            value={row.color_name}
            onChange={(e) => onPatch({ color_name: e.target.value })}
            placeholder="Hitam"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Hex</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={HEX_RE.test(row.color_hex) ? row.color_hex : "#000000"}
              onChange={(e) => onPatch({ color_hex: e.target.value })}
              className="h-9 w-10 cursor-pointer rounded border border-input bg-transparent p-0.5"
              aria-label="Color picker"
            />
            <Input
              value={row.color_hex}
              onChange={(e) => onPatch({ color_hex: e.target.value })}
              placeholder="#1a1a1a"
              className="font-mono"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Image</Label>
          <div className="flex items-center gap-2">
            {row.image_url ? (
              <img
                src={row.image_url}
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
            {row.image_url && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-destructive"
                onClick={() => onPatch({ image_url: null })}
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Stock</Label>
          <Input
            type="number"
            min={0}
            value={row.stock ?? ""}
            onChange={(e) =>
              onPatch({
                stock: e.target.value === "" ? null : Math.max(0, parseInt(e.target.value, 10) || 0),
              })
            }
            placeholder="—"
          />
        </div>
        <div className="flex items-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onMoveUp}
            disabled={isFirst}
            aria-label="Move up"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onMoveDown}
            disabled={isLast}
            aria-label="Move down"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onDelete}
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={onSave}
          disabled={saving}
          variant={isNew ? "default" : "outline"}
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isNew ? "Add color" : "Save"}
        </Button>
      </div>
    </li>
  );
}