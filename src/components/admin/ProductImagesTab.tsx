import { useCallback, useEffect, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MoreVertical, Upload, Star, Trash2, Pencil, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const BUCKET = "product-images";
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES = 10;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export type ProductImage = {
  id: string;
  image_url: string;
  large_url: string | null;
  thumbnail_url: string | null;
  alt_text_en: string | null;
  alt_text_id: string | null;
  sort_order: number;
  is_primary: boolean;
};

type UploadProgress = {
  id: string;
  name: string;
  percent: number; // 0..100
  error?: string;
};

// --- Image processing -------------------------------------------------------

/**
 * Generates three variants of an uploaded image:
 *  - original: resized to max 2000px (preserves source format/quality)
 *  - large:    resized to max 1200px, quality 0.80
 *  - thumb:    cover-cropped to 400x400, quality 0.75
 *
 * Processing happens in the browser via OffscreenCanvas. The Cloudflare
 * Worker runtime cannot run sharp (native bindings), so handling it
 * client-side avoids an extra round-trip and keeps uploads fast.
 */
async function processImage(file: File) {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  const isPng = file.type === "image/png";
  const isWebp = file.type === "image/webp";
  const contentType = isPng ? "image/png" : isWebp ? "image/webp" : "image/jpeg";
  const ext = isPng ? "png" : isWebp ? "webp" : "jpg";

  async function resized(maxDim: number, quality: number) {
    const scale = Math.min(1, maxDim / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const canvas = new OffscreenCanvas(w, h);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
    // PNG ignores `quality`; pass it harmlessly for JPEG/WebP.
    return canvas.convertToBlob({ type: contentType, quality: isPng ? undefined : quality });
  }

  async function thumbnail(size: number, quality: number) {
    const canvas = new OffscreenCanvas(size, size);
    const srcSize = Math.min(width, height);
    const sx = (width - srcSize) / 2;
    const sy = (height - srcSize) / 2;
    canvas
      .getContext("2d")!
      .drawImage(bitmap, sx, sy, srcSize, srcSize, 0, 0, size, size);
    return canvas.convertToBlob({ type: contentType, quality: isPng ? undefined : quality });
  }

  const [original, large, thumb] = await Promise.all([
    resized(2000, 0.9),
    resized(1200, 0.8),
    thumbnail(400, 0.75),
  ]);
  bitmap.close();
  return { original, large, thumb, ext, contentType };
}

function storagePathFromPublicUrl(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

function uuid() {
  return (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// --- Main component ---------------------------------------------------------

export function ProductImagesTab({
  productId,
  sku,
}: {
  productId: string;
  sku: string;
}) {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [altEditing, setAltEditing] = useState<ProductImage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductImage | null>(null);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("product_images")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order");
    setImages((data ?? []) as ProductImage[]);
    setLoading(false);
  }, [productId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // --- Upload ---
  async function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const remainingSlots = MAX_IMAGES - images.length - uploads.filter((u) => !u.error).length;
    if (remainingSlots <= 0) {
      toast.error(`Maximum of ${MAX_IMAGES} images per product reached.`);
      return;
    }
    const toUpload = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      toast.error(`Only ${remainingSlots} more image${remainingSlots === 1 ? "" : "s"} allowed.`);
    }

    for (const file of toUpload) {
      const id = uuid();
      if (!ALLOWED.has(file.type)) {
        setUploads((p) => [...p, { id, name: file.name, percent: 0, error: "Unsupported format" }]);
        toast.error(`${file.name}: unsupported format. Use JPG, PNG, or WebP.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        setUploads((p) => [...p, { id, name: file.name, percent: 0, error: "Too large" }]);
        toast.error(`${file.name}: exceeds 5 MB limit.`);
        continue;
      }
      setUploads((p) => [...p, { id, name: file.name, percent: 5 }]);
      void uploadOne(id, file);
    }
  }

  async function uploadOne(id: string, file: File) {
    const setProgress = (percent: number) =>
      setUploads((p) => p.map((u) => (u.id === id ? { ...u, percent } : u)));
    const setError = (err: string) =>
      setUploads((p) => p.map((u) => (u.id === id ? { ...u, error: err } : u)));

    try {
      setProgress(15);
      const { original, large, thumb, ext, contentType } = await processImage(file);
      setProgress(30);

      const fileId = uuid();
      const safeSku = sku.replace(/[^A-Za-z0-9_-]/g, "_") || productId;
      const filename = `${fileId}.${ext}`;
      const originalPath = `${safeSku}/original/${filename}`;
      const largePath = `${safeSku}/large/${filename}`;
      const thumbPath = `${safeSku}/thumb/${filename}`;

      const uploaded: string[] = [];
      async function put(path: string, body: Blob) {
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, body, { contentType, upsert: false });
        if (error) {
          if (uploaded.length) await supabase.storage.from(BUCKET).remove(uploaded);
          throw new Error(error.message);
        }
        uploaded.push(path);
      }

      await put(originalPath, original);
      setProgress(55);
      await put(largePath, large);
      setProgress(75);
      await put(thumbPath, thumb);
      setProgress(85);

      const { data: pubOriginal } = supabase.storage.from(BUCKET).getPublicUrl(originalPath);
      const { data: pubLarge } = supabase.storage.from(BUCKET).getPublicUrl(largePath);
      const { data: pubThumb } = supabase.storage.from(BUCKET).getPublicUrl(thumbPath);

      // Next sort_order
      const nextOrder = images.length + uploads.filter((u) => !u.error && u.percent === 100).length;
      const isFirst =
        images.length === 0 &&
        uploads.every((u) => u.id === id || u.error || u.percent < 100);

      const { error: insertErr } = await supabase.from("product_images").insert({
        product_id: productId,
        image_url: pubOriginal.publicUrl,
        large_url: pubLarge.publicUrl,
        thumbnail_url: pubThumb.publicUrl,
        sort_order: nextOrder,
        is_primary: isFirst,
      });
      if (insertErr) {
        await supabase.storage.from(BUCKET).remove(uploaded);
        throw new Error(insertErr.message);
      }

      setProgress(100);
      // Remove from queue after a moment so the user sees completion
      setTimeout(() => {
        setUploads((p) => p.filter((u) => u.id !== id));
      }, 600);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setError(msg);
      toast.error(`${file.name}: ${msg}`);
    }
  }

  // --- Drag and drop on the zone ---
  function onZoneDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) void handleFiles(e.dataTransfer.files);
  }

  // --- Sortable reorder ---
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = images.findIndex((i) => i.id === active.id);
    const newIdx = images.findIndex((i) => i.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const reordered = arrayMove(images, oldIdx, newIdx);
    setImages(reordered);

    // Persist new sort_order — first one becomes primary if none manually set
    const updates = reordered.map((img, idx) =>
      supabase
        .from("product_images")
        .update({ sort_order: idx })
        .eq("id", img.id),
    );
    const results = await Promise.all(updates);
    const err = results.find((r) => r.error);
    if (err?.error) {
      toast.error("Reorder failed: " + err.error.message);
      await refresh();
    }
  }

  // --- Set primary ---
  async function setPrimary(img: ProductImage) {
    const { error: e1 } = await supabase
      .from("product_images")
      .update({ is_primary: false })
      .eq("product_id", productId);
    if (e1) {
      toast.error(e1.message);
      return;
    }
    const { error: e2 } = await supabase
      .from("product_images")
      .update({ is_primary: true })
      .eq("id", img.id);
    if (e2) {
      toast.error(e2.message);
      return;
    }
    toast.success("Primary image updated");
    await refresh();
  }

  // --- Delete ---
  async function confirmDelete() {
    if (!deleteTarget) return;
    const img = deleteTarget;
    setDeleteTarget(null);

    const paths = [img.image_url, img.large_url, img.thumbnail_url]
      .map((u) => (u ? storagePathFromPublicUrl(u) : null))
      .filter((p): p is string => !!p);
    if (paths.length) {
      await supabase.storage.from(BUCKET).remove(paths);
    }

    const { error } = await supabase.from("product_images").delete().eq("id", img.id);
    if (error) {
      toast.error(error.message);
      return;
    }

    // Re-sequence sort_order and promote next primary if needed
    const remaining = images.filter((i) => i.id !== img.id);
    const wasPrimary = img.is_primary;
    await Promise.all(
      remaining.map((i, idx) =>
        supabase
          .from("product_images")
          .update({
            sort_order: idx,
            is_primary: wasPrimary && idx === 0 ? true : i.is_primary && i.id !== img.id,
          })
          .eq("id", i.id),
      ),
    );
    toast.success("Image deleted");
    await refresh();
  }

  // --- Save alt text ---
  async function saveAltText(altId: string, altEn: string) {
    if (!altEditing) return;
    const { error } = await supabase
      .from("product_images")
      .update({ alt_text_id: altId || null, alt_text_en: altEn || null })
      .eq("id", altEditing.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setAltEditing(null);
    toast.success("Alt text saved");
    await refresh();
  }

  return (
    <div className="space-y-6">
      {/* Upload zone */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onZoneDrop}
        className={
          "flex h-[300px] w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed bg-white text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 " +
          (dragOver
            ? "border-primary bg-primary/5"
            : "border-input hover:border-primary/50")
        }
        aria-label="Drag photos here or click to upload"
      >
        <Upload className="h-8 w-8 text-muted-foreground" aria-hidden />
        <p className="text-base font-medium text-foreground">
          Drag photos here, or click to upload
        </p>
        <p className="max-w-md text-sm text-muted-foreground">
          JPG, PNG, or WebP. Max 5 MB per file. Recommended: 1200×1200px.
        </p>
        <p className="text-xs text-muted-foreground">
          {images.length} of {MAX_IMAGES} images used
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </button>

      {/* Active uploads */}
      {uploads.length > 0 && (
        <ul className="space-y-2">
          {uploads.map((u) => (
            <li key={u.id} className="rounded-md border border-input bg-white p-3 text-sm">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="truncate font-medium">{u.name}</span>
                <span className={u.error ? "text-destructive" : "text-muted-foreground"}>
                  {u.error ? u.error : `${u.percent}%`}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={"h-full transition-all " + (u.error ? "bg-destructive" : "bg-primary")}
                  style={{ width: `${u.error ? 100 : u.percent}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Image grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading images…
        </div>
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-input py-12 text-muted-foreground">
          <ImageIcon className="h-8 w-8" aria-hidden />
          <p className="text-sm">No images yet. Upload the first one above.</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={images.map((i) => i.id)} strategy={rectSortingStrategy}>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {images.map((img) => (
                <SortableCard
                  key={img.id}
                  img={img}
                  onSetPrimary={() => void setPrimary(img)}
                  onEditAlt={() => setAltEditing(img)}
                  onDelete={() => setDeleteTarget(img)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {/* Alt text dialog */}
      <AltTextDialog
        image={altEditing}
        onClose={() => setAltEditing(null)}
        onSave={saveAltText}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this image?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be removed from this product.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SortableCard({
  img,
  onSetPrimary,
  onEditAlt,
  onDelete,
}: {
  img: ProductImage;
  onSetPrimary: () => void;
  onEditAlt: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: img.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className="group relative overflow-hidden rounded-lg border border-input bg-white shadow-sm"
    >
      <div
        className="relative aspect-square w-full cursor-grab bg-muted active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <img
          src={img.thumbnail_url ?? img.image_url}
          alt={img.alt_text_en ?? img.alt_text_id ?? ""}
          className="h-full w-full object-contain"
          draggable={false}
        />
        {img.is_primary && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-900">
            <Star className="h-2.5 w-2.5 fill-current" /> Primary
          </span>
        )}
        <div className="absolute right-2 top-2" onPointerDown={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-white/90 hover:bg-white"
                aria-label="Image actions"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onSetPrimary} disabled={img.is_primary}>
                <Star className="mr-2 h-4 w-4" /> Set as primary
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onEditAlt}>
                <Pencil className="mr-2 h-4 w-4" /> Edit alt text
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="px-3 py-2">
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {img.alt_text_en || (
            <span className="italic text-muted-foreground/70">No alt text (EN)</span>
          )}
        </p>
      </div>
    </li>
  );
}

function AltTextDialog({
  image,
  onClose,
  onSave,
}: {
  image: ProductImage | null;
  onClose: () => void;
  onSave: (altId: string, altEn: string) => void | Promise<void>;
}) {
  const [altId, setAltId] = useState("");
  const [altEn, setAltEn] = useState("");

  useEffect(() => {
    setAltId(image?.alt_text_id ?? "");
    setAltEn(image?.alt_text_en ?? "");
  }, [image]);

  return (
    <Dialog open={image !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit alt text</DialogTitle>
          <DialogDescription>
            Briefly describe what's in the image for accessibility and SEO. Example:
            "Forest green Consina Centurion 60L carrier with adjustable straps."
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="alt-id">Alt text (Indonesian)</Label>
            <Input
              id="alt-id"
              value={altId}
              onChange={(e) => setAltId(e.target.value)}
              placeholder="Tas carrier Consina Centurion 60L hijau hutan…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="alt-en">Alt text (English)</Label>
            <Input
              id="alt-en"
              value={altEn}
              onChange={(e) => setAltEn(e.target.value)}
              placeholder="Forest green Consina Centurion 60L carrier…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void onSave(altId, altEn)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}