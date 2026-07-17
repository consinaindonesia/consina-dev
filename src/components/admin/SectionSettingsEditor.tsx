import { useState } from "react";
import { toast } from "sonner";
import { Upload, Trash2, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { usePublicCategories } from "@/hooks/use-public-categories";
import { usePublicProducts } from "@/lib/public-products";
import type {
  SectionTypeId,
  Localized,
  CTAConfig,
  SectionStyle,
  StatItem,
  HeroSettings,
  FeaturedProductsSettings,
  CategoriesSettings,
  ActivitiesSettings,
  ActivityItem,
  ZeroWasteSettings,
  BrandStorySettings,
  CommunitySettings,
  StatsSettings,
  FaqCustomSettings,
  FaqItem,
  NewsletterSettings,
  ImageBannerSettings,
  GallerySettings,
  GalleryImage,
  TestimonialsSettings,
  TestimonialItem,
  SpacerSettings,
  AnnouncementBarSettings,
  StoreLocatorSettings,
  StoreItem,
  FaqSettings,
  ContactSettings,
  CustomSectionSettings,
  VideoYoutubeSettings,
} from "@/lib/section-registry";

type AnyObj = Record<string, unknown>;

export function SectionSettingsEditor({
  type,
  value,
  onChange,
}: {
  type: SectionTypeId;
  value: AnyObj;
  onChange: (next: AnyObj) => void;
}) {
  const set = (key: string, v: unknown) => onChange({ ...value, [key]: v });

  return (
    <div className="space-y-5">
      <StyleEditor
        value={(value.style as SectionStyle) ?? {}}
        onChange={(style) => set("style", style)}
      />

      {type === "hero" && (
        <HeroEditor value={value as HeroSettings} onChange={onChange as (v: HeroSettings) => void} />
      )}
      {type === "featured_products" && (
        <FeaturedEditor
          value={value as FeaturedProductsSettings}
          onChange={onChange as (v: FeaturedProductsSettings) => void}
        />
      )}
      {type === "categories" && (
        <CategoriesEditor
          value={value as CategoriesSettings}
          onChange={onChange as (v: CategoriesSettings) => void}
        />
      )}
      {type === "activities" && (
        <ActivitiesEditor
          value={value as ActivitiesSettings}
          onChange={onChange as (v: ActivitiesSettings) => void}
        />
      )}
      {type === "zero_waste" && (
        <ZeroWasteEditor
          value={value as ZeroWasteSettings}
          onChange={onChange as (v: ZeroWasteSettings) => void}
        />
      )}
      {type === "brand_story" && (
        <BrandStoryEditor
          value={value as BrandStorySettings}
          onChange={onChange as (v: BrandStorySettings) => void}
        />
      )}
      {type === "community" && (
        <CommunityEditor
          value={value as CommunitySettings}
          onChange={onChange as (v: CommunitySettings) => void}
        />
      )}
      {type === "stats" && (
        <StatsEditor value={value as StatsSettings} onChange={onChange as (v: StatsSettings) => void} />
      )}
      {type === "faq_custom" && (
        <FaqCustomEditor value={value as FaqCustomSettings} onChange={onChange as (v: FaqCustomSettings) => void} />
      )}
      {type === "newsletter" && (
        <NewsletterEditor value={value as NewsletterSettings} onChange={onChange as (v: NewsletterSettings) => void} />
      )}
      {type === "image_banner" && (
        <ImageBannerEditor value={value as ImageBannerSettings} onChange={onChange as (v: ImageBannerSettings) => void} />
      )}
      {type === "gallery" && (
        <GalleryEditor value={value as GallerySettings} onChange={onChange as (v: GallerySettings) => void} />
      )}
      {type === "testimonials" && (
        <TestimonialsEditor value={value as TestimonialsSettings} onChange={onChange as (v: TestimonialsSettings) => void} />
      )}
      {type === "spacer" && (
        <SpacerEditor value={value as SpacerSettings} onChange={onChange as (v: SpacerSettings) => void} />
      )}
      {type === "announcement_bar" && (
        <AnnouncementBarEditor value={value as AnnouncementBarSettings} onChange={onChange as (v: AnnouncementBarSettings) => void} />
      )}
      {type === "store_locator" && (
        <StoreLocatorEditor value={value as StoreLocatorSettings} onChange={onChange as (v: StoreLocatorSettings) => void} />
      )}
      {type === "faq" && (
        <FaqEditor value={value as FaqSettings} onChange={onChange as (v: FaqSettings) => void} />
      )}
      {type === "contact" && (
        <ContactEditor value={value as ContactSettings} onChange={onChange as (v: ContactSettings) => void} />
      )}
      {type === "custom" && (
        <CustomEditor value={value as CustomSectionSettings} onChange={onChange as (v: CustomSectionSettings) => void} />
      )}
      {type === "video_youtube" && (
        <VideoYoutubeEditor value={value as VideoYoutubeSettings} onChange={onChange as (v: VideoYoutubeSettings) => void} />
      )}
    </div>
  );
}

/* -------------------- Style -------------------- */
function StyleEditor({
  value,
  onChange,
}: {
  value: SectionStyle;
  onChange: (v: SectionStyle) => void;
}) {
  const [open, setOpen] = useState(false);
  const padding = value.padding ?? "M";
  return (
    <div className="rounded-md border border-border bg-background">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        Section style
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className="grid gap-3 border-t border-border p-3 sm:grid-cols-3">
          <ColorField
            label="Background"
            value={value.bgColor ?? ""}
            onChange={(v) => onChange({ ...value, bgColor: v || undefined })}
          />
          <ColorField
            label="Text"
            value={value.textColor ?? ""}
            onChange={(v) => onChange({ ...value, textColor: v || undefined })}
          />
          <div>
            <Label className="text-xs">Padding</Label>
            <div className="mt-1 flex gap-1">
              {(["S", "M", "L"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onChange({ ...value, padding: p })}
                  className={`flex-1 rounded border px-2 py-1 text-xs font-semibold ${
                    padding === p
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background hover:bg-muted"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <ColorField
            label="Eyebrow color"
            value={value.eyebrowColor ?? ""}
            onChange={(v) => onChange({ ...value, eyebrowColor: v || undefined })}
          />
          <ColorField
            label="Heading color"
            value={value.headingColor ?? ""}
            onChange={(v) => onChange({ ...value, headingColor: v || undefined })}
          />
          <ColorField
            label="Description color"
            value={value.bodyColor ?? ""}
            onChange={(v) => onChange({ ...value, bodyColor: v || undefined })}
          />
          <ColorField
            label="CTA text color"
            value={value.ctaTextColor ?? ""}
            onChange={(v) => onChange({ ...value, ctaTextColor: v || undefined })}
          />
          <div className="sm:col-span-3">
            <Label className="text-xs">Description alignment</Label>
            <div className="mt-1 flex gap-1">
              {(["left", "center", "right"] as const).map((a) => {
                const active = (value.bodyAlign ?? "") === a;
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() =>
                      onChange({ ...value, bodyAlign: active ? undefined : a })
                    }
                    className={`flex-1 rounded border px-2 py-1 text-xs font-semibold capitalize ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background hover:bg-muted"
                    }`}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Applies to the description / body text. Click the active option again to clear.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  // Try to coerce to a hex for the color picker; fall back to white.
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : "#ffffff";
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-input bg-transparent"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="default"
          className="h-8 flex-1 text-xs"
        />
      </div>
    </div>
  );
}

/* -------------------- Localized + CTA + Image -------------------- */
function LocalizedField({
  label,
  value,
  onChange,
  multiline,
  placeholder,
}: {
  label: string;
  value: Localized | undefined;
  onChange: (v: Localized) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  const v = value ?? {};
  const Comp = multiline ? Textarea : Input;
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1 grid gap-2 sm:grid-cols-2">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">ID</span>
          <Comp
            value={v.id ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
              onChange({ ...v, id: e.target.value })
            }
            placeholder={placeholder}
          />
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">EN</span>
          <Comp
            value={v.en ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
              onChange({ ...v, en: e.target.value })
            }
            placeholder={placeholder}
          />
        </div>
      </div>
    </div>
  );
}

function CTAEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: CTAConfig | undefined;
  onChange: (v: CTAConfig | undefined) => void;
}) {
  const v = value ?? {};
  return (
    <div className="rounded border border-input p-3">
      <div className="mb-2 flex items-center justify-between">
        <Label className="text-xs font-semibold">{label}</Label>
        {value && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            Remove
          </button>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Label ID</span>
          <Input value={v.labelId ?? ""} onChange={(e) => onChange({ ...v, labelId: e.target.value })} />
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Label EN</span>
          <Input value={v.labelEn ?? ""} onChange={(e) => onChange({ ...v, labelEn: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Link</span>
          <Input value={v.href ?? ""} onChange={(e) => onChange({ ...v, href: e.target.value })} placeholder="/catalog or https://…" />
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Style</span>
          <select
            value={v.style ?? "primary"}
            onChange={(e) => onChange({ ...v, style: e.target.value as CTAConfig["style"] })}
            className="mt-0.5 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
            <option value="outline">Outline</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export function ImagePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `site/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from("category-images")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("category-images").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error("Upload failed: " + (e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1 space-y-2">
        {value ? (
          <div className="relative">
            <img src={value} alt="" className="h-32 w-full rounded border border-input object-cover" />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute right-1 top-1 rounded bg-background/90 p-1 text-muted-foreground hover:text-destructive"
              aria-label="Remove image"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center rounded border border-dashed border-input text-xs text-muted-foreground">
            Using default image
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Paste image URL or upload"
            className="h-9 flex-1 text-xs"
          />
          <label className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-md border border-input bg-background px-3 text-xs hover:bg-muted">
            <Upload className="h-3.5 w-3.5" />
            {uploading ? "…" : "Upload"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

/* -------------------- Section-specific editors -------------------- */

function HeroEditor({ value, onChange }: { value: HeroSettings; onChange: (v: HeroSettings) => void }) {
  const overlay = value.overlay ?? 40;
  return (
    <div className="space-y-4">
      <ImagePicker
        label="Background image"
        value={value.image}
        onChange={(v) => onChange({ ...value, image: v })}
      />
      <LocalizedField
        label="Image alt text"
        value={value.imageAlt}
        onChange={(v) => onChange({ ...value, imageAlt: v })}
        placeholder="Describe the background image"
      />
      <div>
        <Label className="text-xs">Overlay darkness — {overlay}%</Label>
        <Slider
          value={[overlay]}
          min={0}
          max={100}
          step={5}
          onValueChange={(vals) => onChange({ ...value, overlay: vals[0] ?? 0 })}
          className="mt-2"
        />
      </div>
      <LocalizedField label="Eyebrow" value={value.eyebrow} onChange={(v) => onChange({ ...value, eyebrow: v })} />
      <LocalizedField
        label="Heading (use {em}…{/em} for highlight, newline for line break)"
        value={value.heading}
        onChange={(v) => onChange({ ...value, heading: v })}
        multiline
      />
      <LocalizedField label="Subtitle" value={value.subtitle} onChange={(v) => onChange({ ...value, subtitle: v })} multiline />
      <CTAEditor label="Primary CTA" value={value.ctaPrimary} onChange={(v) => onChange({ ...value, ctaPrimary: v })} />
      <CTAEditor label="Secondary CTA" value={value.ctaSecondary} onChange={(v) => onChange({ ...value, ctaSecondary: v })} />
      <StatsItemsEditor
        label="Hero stats"
        items={value.stats ?? []}
        onChange={(items) => onChange({ ...value, stats: items })}
      />
    </div>
  );
}

function StatsItemsEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: StatItem[];
  onChange: (items: StatItem[]) => void;
}) {
  const update = (i: number, patch: Partial<StatItem>) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  return (
    <div className="rounded border border-input p-3">
      <div className="mb-2 flex items-center justify-between">
        <Label className="text-xs font-semibold">{label}</Label>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onChange([...items, { value: "0", labelId: "", labelEn: "" }])}
        >
          <Plus className="mr-1 h-3 w-3" /> Add
        </Button>
      </div>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="grid grid-cols-[80px_1fr_1fr_auto] items-center gap-2">
            <Input value={it.value} onChange={(e) => update(i, { value: e.target.value })} placeholder="25+" />
            <Input value={it.labelId ?? ""} onChange={(e) => update(i, { labelId: e.target.value })} placeholder="Label ID" />
            <Input value={it.labelEn ?? ""} onChange={(e) => update(i, { labelEn: e.target.value })} placeholder="Label EN" />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="rounded p-1.5 text-muted-foreground hover:text-destructive"
              aria-label="Remove"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeaturedEditor({
  value,
  onChange,
}: {
  value: FeaturedProductsSettings;
  onChange: (v: FeaturedProductsSettings) => void;
}) {
  const { products } = usePublicProducts();
  const source = value.source ?? "featured";
  const selected = value.productIds ?? [];
  const autoScroll = value.autoScroll ?? true;
  const toggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    onChange({ ...value, productIds: next });
  };
  return (
    <div className="space-y-4">
      <LocalizedField label="Title" value={value.title} onChange={(v) => onChange({ ...value, title: v })} />
      <LocalizedField label="Subtitle / eyebrow" value={value.subtitle} onChange={(v) => onChange({ ...value, subtitle: v })} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Source</Label>
          <select
            value={source}
            onChange={(e) => onChange({ ...value, source: e.target.value as "featured" | "manual" })}
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="featured">Featured flag</option>
            <option value="manual">Manual selection</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Card count</Label>
          <Input
            type="number"
            min={1}
            max={24}
            value={value.count ?? 8}
            onChange={(e) => onChange({ ...value, count: Number(e.target.value) || 8 })}
          />
        </div>
      </div>
      <div className="rounded border border-input p-3">
        <Label className="text-xs font-semibold">Auto-scroll carousel</Label>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">
            Geser kartu otomatis, berhenti beberapa detik, lalu jalan lagi.
          </p>
          <label className="flex items-center gap-2 text-xs font-medium">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => onChange({ ...value, autoScroll: e.target.checked })}
            />
            Enable
          </label>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Pause duration (seconds)</Label>
            <Input
              type="number"
              min={1}
              max={15}
              value={value.pauseSeconds ?? 3}
              onChange={(e) => onChange({ ...value, pauseSeconds: Number(e.target.value) || 3 })}
            />
          </div>
          <div>
            <Label className="text-xs">Scroll speed (ms per move)</Label>
            <Input
              type="number"
              min={200}
              max={5000}
              step={100}
              value={value.scrollDurationMs ?? 900}
              onChange={(e) => onChange({ ...value, scrollDurationMs: Number(e.target.value) || 900 })}
            />
          </div>
        </div>
      </div>
      {source === "manual" && (
        <div>
          <Label className="text-xs">Products ({selected.length} selected)</Label>
          <div className="mt-1 max-h-64 overflow-y-auto rounded border border-input">
            {products.map((p) => {
              const checked = selected.includes(p.id);
              return (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-2 border-b border-border px-2 py-1.5 text-xs last:border-b-0 hover:bg-muted"
                >
                  <input type="checkbox" checked={checked} onChange={() => toggle(p.id)} />
                  <span className="truncate">{p.name_en || p.name_id || p.sku}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
      <CTAEditor
        label="‘View all’ CTA (optional)"
        value={value.viewAllCta}
        onChange={(v) => onChange({ ...value, viewAllCta: v })}
      />
    </div>
  );
}

function CategoriesEditor({
  value,
  onChange,
}: {
  value: CategoriesSettings;
  onChange: (v: CategoriesSettings) => void;
}) {
  const { data: cats } = usePublicCategories();
  const list = cats ?? [];
  const allSlugs = list.map((c) => c.slug);
  const hasManualSelection = Array.isArray(value.categorySlugs);
  const selectedSlugs = hasManualSelection ? value.categorySlugs ?? [] : allSlugs;
  const hiddenSlugs = allSlugs.filter((slug) => !selectedSlugs.includes(slug));
  const editorSlugs = [...selectedSlugs, ...hiddenSlugs];
  const autoScroll = value.autoScroll ?? true;

  const toggle = (slug: string) => {
    const cur = hasManualSelection ? [...selectedSlugs] : [...allSlugs];
    const next = cur.includes(slug) ? cur.filter((x) => x !== slug) : [...cur, slug];
    onChange({
      ...value,
      categorySlugs: next.length === allSlugs.length ? undefined : next,
    });
  };
  const move = (slug: string, dir: -1 | 1) => {
    const cur = [...selectedSlugs];
    const idx = cur.indexOf(slug);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= cur.length) return;
    [cur[idx], cur[j]] = [cur[j], cur[idx]];
    onChange({ ...value, categorySlugs: cur });
  };

  return (
    <div className="space-y-4">
      <LocalizedField label="Eyebrow" value={value.eyebrow} onChange={(v) => onChange({ ...value, eyebrow: v })} />
      <LocalizedField label="Title" value={value.title} onChange={(v) => onChange({ ...value, title: v })} />
      <LocalizedField label="Subtitle" value={value.subtitle} onChange={(v) => onChange({ ...value, subtitle: v })} />
      <CTAEditor
        label="Card CTA button"
        value={value.cardCta}
        onChange={(v) => onChange({ ...value, cardCta: v })}
      />
      <div className="rounded border border-input p-3">
        <Label className="text-xs font-semibold">Auto-scroll carousel</Label>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">
            Geser kartu otomatis, berhenti beberapa detik, lalu jalan lagi.
          </p>
          <label className="flex items-center gap-2 text-xs font-medium">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => onChange({ ...value, autoScroll: e.target.checked })}
            />
            Enable
          </label>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Pause duration (seconds)</Label>
            <Input
              type="number"
              min={1}
              max={15}
              value={value.pauseSeconds ?? 3}
              onChange={(e) => onChange({ ...value, pauseSeconds: Number(e.target.value) || 3 })}
            />
          </div>
          <div>
            <Label className="text-xs">Scroll speed (ms per move)</Label>
            <Input
              type="number"
              min={200}
              max={5000}
              step={100}
              value={value.scrollDurationMs ?? 900}
              onChange={(e) => onChange({ ...value, scrollDurationMs: Number(e.target.value) || 900 })}
            />
          </div>
        </div>
      </div>
      <div>
        <Label className="text-xs">Categories & order</Label>
        <ul className="mt-1 divide-y divide-border rounded border border-input">
          {editorSlugs.map((slug) => {
            const c = list.find((x) => x.slug === slug);
            const included = selectedSlugs.includes(slug);
            return (
              <li key={slug} className="flex items-center gap-2 px-2 py-1.5 text-xs">
                <input type="checkbox" checked={included} onChange={() => toggle(slug)} />
                <span className="flex-1 truncate">{c?.name_en || slug}</span>
                <button
                  type="button"
                  onClick={() => move(slug, -1)}
                  disabled={!included}
                  className="rounded p-1 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Move up"
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => move(slug, 1)}
                  disabled={!included}
                  className="rounded p-1 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Move down"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Check to show a category, uncheck to hide it. Use ↑↓ to reorder visible cards.
        </p>
      </div>
      <div className="rounded border border-input p-3">
        <Label className="text-xs font-semibold">Category card images</Label>
        <p className="mt-1 mb-2 text-[10px] text-muted-foreground">
          Auto = newest uploaded product photo from this category. Manual = your chosen image.
        </p>
        <div className="space-y-3">
          {selectedSlugs.map((slug) => {
            const c = list.find((x) => x.slug === slug);
            const cur = (value.categoryImages ?? {})[slug] ?? {};
            const mode = cur.mode ?? "auto";
            const setOverride = (next: {
              mode?: "auto" | "manual";
              src?: string;
              descriptionId?: string;
              descriptionEn?: string;
            }) =>
              onChange({
                ...value,
                categoryImages: { ...(value.categoryImages ?? {}), [slug]: { ...cur, ...next } },
              });
            return (
              <div key={slug} className="rounded border border-border bg-background p-2">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium">{c?.name_en || slug}</span>
                  <div className="flex gap-1">
                    {(["auto", "manual"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setOverride({ mode: m })}
                        className={`rounded border px-2 py-0.5 text-[10px] font-semibold capitalize ${
                          mode === m ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background hover:bg-muted"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                {mode === "manual" && (
                  <ImagePicker label="Manual image" value={cur.src} onChange={(v) => setOverride({ src: v })} />
                )}
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div>
                    <Label className="text-[10px]">Description (ID)</Label>
                    <Input
                      value={cur.descriptionId ?? ""}
                      onChange={(e) => setOverride({ descriptionId: e.target.value })}
                      placeholder="Override card description"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">Description (EN)</Label>
                    <Input
                      value={cur.descriptionEn ?? ""}
                      onChange={(e) => setOverride({ descriptionEn: e.target.value })}
                      placeholder="Override card description"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <CTAEditor
        label="‘View all’ CTA (right of heading)"
        value={value.viewAllCta}
        onChange={(v) => onChange({ ...value, viewAllCta: v })}
      />
    </div>
  );
}

function ActivitiesEditor({
  value,
  onChange,
}: {
  value: ActivitiesSettings;
  onChange: (v: ActivitiesSettings) => void;
}) {
  const items = value.items ?? [];
  const updateItem = (idx: number, next: ActivityItem) => {
    onChange({ ...value, items: items.map((item, i) => (i === idx ? next : item)) });
  };

  return (
    <div className="space-y-4">
      <LocalizedField label="Eyebrow" value={value.eyebrow} onChange={(v) => onChange({ ...value, eyebrow: v })} />
      <LocalizedField label="Title" value={value.title} onChange={(v) => onChange({ ...value, title: v })} />
      <LocalizedField
        label="Subtitle"
        value={value.subtitle}
        onChange={(v) => onChange({ ...value, subtitle: v })}
        multiline
      />
      <div className="rounded border border-dashed border-border p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <Label className="text-sm font-semibold">Activity cards</Label>
            <p className="text-xs text-muted-foreground">Small Decathlon-style shortcuts for Bike, Climbing, Hiking, Camping, etc.</p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() =>
              onChange({
                ...value,
                items: [...items, { enabled: true, title: { id: "Aktivitas baru", en: "New activity" }, href: "/catalog" }],
              })
            }
          >
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </div>
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="rounded border border-border bg-background p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={item.enabled !== false}
                    onChange={(e) => updateItem(idx, { ...item, enabled: e.target.checked })}
                  />
                  Card #{idx + 1}
                </label>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => onChange({ ...value, items: items.filter((_, i) => i !== idx) })}
                  aria-label="Remove activity"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <LocalizedField
                label="Title"
                value={item.title}
                onChange={(v) => updateItem(idx, { ...item, title: v })}
              />
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <ImagePicker label="Image" value={item.image} onChange={(v) => updateItem(idx, { ...item, image: v })} />
                <div>
                  <Label className="text-xs">Link</Label>
                  <Input
                    value={item.href ?? ""}
                    onChange={(e) => updateItem(idx, { ...item, href: e.target.value })}
                    placeholder="/catalog?activity=hiking"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ZeroWasteEditor({
  value,
  onChange,
}: {
  value: ZeroWasteSettings;
  onChange: (v: ZeroWasteSettings) => void;
}) {
  return (
    <div className="space-y-4">
      <ImagePicker label="Background image" value={value.backgroundImage} onChange={(v) => onChange({ ...value, backgroundImage: v })} />
      <ImagePicker label="Logo / badge image (optional)" value={value.logoImage} onChange={(v) => onChange({ ...value, logoImage: v })} />
      <div>
        <Label className="text-xs">Overlay darkness ({value.overlay ?? 68}%)</Label>
        <Slider
          value={[value.overlay ?? 68]}
          min={0}
          max={90}
          step={1}
          onValueChange={([overlay]) => onChange({ ...value, overlay })}
          className="mt-3"
        />
      </div>
      <LocalizedField label="Badge / tagline" value={value.badge} onChange={(v) => onChange({ ...value, badge: v })} />
      <LocalizedField label="Title" value={value.title} onChange={(v) => onChange({ ...value, title: v })} multiline />
      <LocalizedField label="Body" value={value.body} onChange={(v) => onChange({ ...value, body: v })} multiline />
      <CTAEditor label="Claim CTA" value={value.cta} onChange={(v) => onChange({ ...value, cta: v })} />
    </div>
  );
}

function BrandStoryEditor({
  value,
  onChange,
}: {
  value: BrandStorySettings;
  onChange: (v: BrandStorySettings) => void;
}) {
  return (
    <div className="space-y-4">
      <ImagePicker label="Image" value={value.image} onChange={(v) => onChange({ ...value, image: v })} />
      <LocalizedField
        label="Image alt text"
        value={value.imageAlt}
        onChange={(v) => onChange({ ...value, imageAlt: v })}
      />
      <LocalizedField label="Eyebrow" value={value.eyebrow} onChange={(v) => onChange({ ...value, eyebrow: v })} />
      <LocalizedField label="Heading" value={value.heading} onChange={(v) => onChange({ ...value, heading: v })} />
      <div>
        <Label className="text-xs">Body (ID)</Label>
        <Textarea
          rows={6}
          value={value.bodyId ?? ""}
          onChange={(e) => onChange({ ...value, bodyId: e.target.value })}
        />
      </div>
      <div>
        <Label className="text-xs">Body (EN)</Label>
        <Textarea
          rows={6}
          value={value.bodyEn ?? ""}
          onChange={(e) => onChange({ ...value, bodyEn: e.target.value })}
        />
      </div>
      <CTAEditor label="CTA" value={value.cta} onChange={(v) => onChange({ ...value, cta: v })} />
      <div className="grid gap-3 sm:grid-cols-2">
        <LocalizedField
          label="Expand button label"
          value={value.expandLabel}
          onChange={(v) => onChange({ ...value, expandLabel: v })}
          placeholder="Read more"
        />
        <LocalizedField
          label="Collapse button label"
          value={value.collapseLabel}
          onChange={(v) => onChange({ ...value, collapseLabel: v })}
          placeholder="Show less"
        />
      </div>
    </div>
  );
}

function CommunityEditor({
  value,
  onChange,
}: {
  value: CommunitySettings;
  onChange: (v: CommunitySettings) => void;
}) {
  return (
    <div className="space-y-4">
      <ImagePicker label="Image" value={value.image} onChange={(v) => onChange({ ...value, image: v })} />
      <LocalizedField
        label="Image alt text"
        value={value.imageAlt}
        onChange={(v) => onChange({ ...value, imageAlt: v })}
      />
      <div>
        <Label className="text-xs">Image side</Label>
        <div className="mt-1 flex gap-1">
          {(["left", "right"] as const).map((side) => (
            <button
              key={side}
              type="button"
              onClick={() => onChange({ ...value, imageSide: side })}
              className={`flex-1 rounded border px-2 py-1 text-xs font-semibold capitalize ${
                (value.imageSide ?? "right") === side
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background hover:bg-muted"
              }`}
            >
              {side}
            </button>
          ))}
        </div>
      </div>
      <LocalizedField label="Eyebrow" value={value.eyebrow} onChange={(v) => onChange({ ...value, eyebrow: v })} />
      <LocalizedField label="Heading" value={value.heading} onChange={(v) => onChange({ ...value, heading: v })} />
      <div>
        <Label className="text-xs">Body (ID)</Label>
        <Textarea
          rows={5}
          value={value.bodyId ?? ""}
          onChange={(e) => onChange({ ...value, bodyId: e.target.value })}
        />
      </div>
      <div>
        <Label className="text-xs">Body (EN)</Label>
        <Textarea
          rows={5}
          value={value.bodyEn ?? ""}
          onChange={(e) => onChange({ ...value, bodyEn: e.target.value })}
        />
      </div>
      <CTAEditor label="CTA" value={value.cta} onChange={(v) => onChange({ ...value, cta: v })} />
    </div>
  );
}

function StatsEditor({ value, onChange }: { value: StatsSettings; onChange: (v: StatsSettings) => void }) {
  return (
    <StatsItemsEditor
      label="Stats"
      items={value.items ?? []}
      onChange={(items) => onChange({ ...value, items })}
    />
  );
}

/* -------------------- FAQ (custom) -------------------- */
function FaqCustomEditor({ value, onChange }: { value: FaqCustomSettings; onChange: (v: FaqCustomSettings) => void }) {
  const items = value.items ?? [];
  const update = (i: number, patch: Partial<FaqItem>) =>
    onChange({ ...value, items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });
  const move = (i: number, dir: -1 | 1) => {
    const next = [...items];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ ...value, items: next });
  };
  return (
    <div className="space-y-4">
      <LocalizedField label="Eyebrow" value={value.eyebrow} onChange={(v) => onChange({ ...value, eyebrow: v })} />
      <LocalizedField label="Title" value={value.title} onChange={(v) => onChange({ ...value, title: v })} />
      <LocalizedField label="Subtitle" value={value.subtitle} onChange={(v) => onChange({ ...value, subtitle: v })} />
      <div className="rounded border border-input p-3">
        <div className="mb-2 flex items-center justify-between">
          <Label className="text-xs font-semibold">Questions & answers</Label>
          <Button size="sm" variant="outline" onClick={() => onChange({ ...value, items: [...items, {}] })}>
            <Plus className="mr-1 h-3 w-3" /> Add
          </Button>
        </div>
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="rounded border border-border bg-background p-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Q&A #{i + 1}</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => move(i, -1)} className="rounded p-1 hover:bg-muted" aria-label="Up"><ChevronUp className="h-3 w-3" /></button>
                  <button type="button" onClick={() => move(i, 1)} className="rounded p-1 hover:bg-muted" aria-label="Down"><ChevronDown className="h-3 w-3" /></button>
                  <button type="button" onClick={() => onChange({ ...value, items: items.filter((_, idx) => idx !== i) })} className="rounded p-1 text-muted-foreground hover:text-destructive" aria-label="Remove"><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input value={it.questionId ?? ""} onChange={(e) => update(i, { questionId: e.target.value })} placeholder="Pertanyaan (ID)" />
                <Input value={it.questionEn ?? ""} onChange={(e) => update(i, { questionEn: e.target.value })} placeholder="Question (EN)" />
                <Textarea value={it.answerId ?? ""} onChange={(e) => update(i, { answerId: e.target.value })} placeholder="Jawaban (ID)" />
                <Textarea value={it.answerEn ?? ""} onChange={(e) => update(i, { answerEn: e.target.value })} placeholder="Answer (EN)" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------- Newsletter -------------------- */
function NewsletterEditor({ value, onChange }: { value: NewsletterSettings; onChange: (v: NewsletterSettings) => void }) {
  return (
    <div className="space-y-4">
      <LocalizedField label="Eyebrow" value={value.eyebrow} onChange={(v) => onChange({ ...value, eyebrow: v })} />
      <LocalizedField label="Heading" value={value.heading} onChange={(v) => onChange({ ...value, heading: v })} />
      <LocalizedField label="Body" value={value.body} onChange={(v) => onChange({ ...value, body: v })} multiline />
      <LocalizedField label="Email placeholder" value={value.placeholder} onChange={(v) => onChange({ ...value, placeholder: v })} />
      <LocalizedField label="Button label" value={value.buttonLabel} onChange={(v) => onChange({ ...value, buttonLabel: v })} />
      <LocalizedField label="Success message" value={value.successMessage} onChange={(v) => onChange({ ...value, successMessage: v })} />
      <LocalizedField label="Invalid email message" value={value.errorMessage} onChange={(v) => onChange({ ...value, errorMessage: v })} />
      <p className="text-[11px] text-muted-foreground">Subscribers are saved to the newsletter_subscribers table.</p>
    </div>
  );
}

/* -------------------- Image Banner -------------------- */
function ImageBannerEditor({ value, onChange }: { value: ImageBannerSettings; onChange: (v: ImageBannerSettings) => void }) {
  const alignment = value.alignment ?? "center";
  // Seed slides from legacy single image on first edit so existing content carries over.
  const slides = value.slides && value.slides.length > 0
    ? value.slides
    : value.image
      ? [{ image: value.image }]
      : [];
  const aspect = value.aspectRatio ?? "16:9";
  const interval = typeof value.intervalMs === "number" ? value.intervalMs : 2000;
  const updateSlide = (i: number, patch: Partial<{ image: string; href?: string; alt?: string }>) =>
    onChange({ ...value, slides: slides.map((sl, idx) => (idx === i ? { ...sl, ...patch } : sl)) });
  const moveSlide = (i: number, dir: -1 | 1) => {
    const next = [...slides];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ ...value, slides: next });
  };
  return (
    <div className="space-y-4">
      <div className="rounded border border-input p-3">
        <div className="mb-2 flex items-center justify-between">
          <Label className="text-xs font-semibold">Carousel slides</Label>
          <Button size="sm" variant="outline" onClick={() => onChange({ ...value, slides: [...slides, { image: "" }] })}>
            <Plus className="mr-1 h-3 w-3" /> Add slide
          </Button>
        </div>
        <p className="mb-2 text-[11px] text-muted-foreground">Suggested 2–6 images. Auto-advances and supports swipe / arrows / dots.</p>
        <div className="space-y-3">
          {slides.map((sl, i) => (
            <div key={i} className="rounded border border-border bg-background p-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Slide #{i + 1}</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => moveSlide(i, -1)} className="rounded p-1 hover:bg-muted" aria-label="Up"><ChevronUp className="h-3 w-3" /></button>
                  <button type="button" onClick={() => moveSlide(i, 1)} className="rounded p-1 hover:bg-muted" aria-label="Down"><ChevronDown className="h-3 w-3" /></button>
                  <button type="button" onClick={() => onChange({ ...value, slides: slides.filter((_, idx) => idx !== i) })} className="rounded p-1 text-muted-foreground hover:text-destructive" aria-label="Remove"><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>
              <ImagePicker label="Image" value={sl.image} onChange={(v) => updateSlide(i, { image: v })} />
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <Input value={sl.alt ?? ""} onChange={(e) => updateSlide(i, { alt: e.target.value })} placeholder="Alt text (optional)" />
                <Input value={sl.href ?? ""} onChange={(e) => updateSlide(i, { href: e.target.value })} placeholder="Link URL (optional)" />
              </div>
            </div>
          ))}
          {slides.length === 0 && (
            <p className="text-[11px] text-muted-foreground">No slides yet. Add at least one image.</p>
          )}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Text alignment</Label>
          <div className="mt-1 flex gap-1">
            {(["left", "center", "right"] as const).map((a) => (
              <button key={a} type="button" onClick={() => onChange({ ...value, alignment: a })}
                className={`flex-1 rounded border px-2 py-1 text-xs capitalize ${alignment === a ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background hover:bg-muted"}`}>{a}</button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-xs">Aspect ratio</Label>
          <div className="mt-1 flex gap-1">
            {(["16:9", "4:3", "1:1"] as const).map((r) => (
              <button key={r} type="button" onClick={() => onChange({ ...value, aspectRatio: r })}
                className={`flex-1 rounded border px-2 py-1 text-xs ${aspect === r ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background hover:bg-muted"}`}>{r}</button>
            ))}
          </div>
        </div>
      </div>
      <div>
        <Label className="text-xs">Auto-advance interval — {(interval / 1000).toFixed(1)}s {interval === 0 ? "(off)" : ""}</Label>
        <Input
          type="number"
          min={1}
          max={10}
          step={1}
          className="mt-2 w-28"
          value={Math.max(1, Math.round((interval || 2000) / 1000))}
          onChange={(e) => {
            const n = Math.max(1, Math.min(10, Number(e.target.value) || 2));
            onChange({ ...value, intervalMs: n * 1000 });
          }}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">Set to 0 to disable auto-advance. Always disabled for users with reduced-motion preference.</p>
      </div>
      <LocalizedField label="Eyebrow" value={value.eyebrow} onChange={(v) => onChange({ ...value, eyebrow: v })} />
      <LocalizedField label="Heading" value={value.heading} onChange={(v) => onChange({ ...value, heading: v })} />
      <LocalizedField label="Body" value={value.body} onChange={(v) => onChange({ ...value, body: v })} multiline />
      <CTAEditor label="CTA" value={value.cta} onChange={(v) => onChange({ ...value, cta: v })} />
      <p className="text-[11px] text-muted-foreground">Text appears above the carousel for readability. Each slide can link to its own URL.</p>
    </div>
  );
}

/* -------------------- Gallery -------------------- */
function GalleryEditor({ value, onChange }: { value: GallerySettings; onChange: (v: GallerySettings) => void }) {
  const images = value.images ?? [];
  const cols = value.columns ?? 3;
  const update = (i: number, patch: Partial<GalleryImage>) =>
    onChange({ ...value, images: images.map((im, idx) => (idx === i ? { ...im, ...patch } : im)) });
  const move = (i: number, dir: -1 | 1) => {
    const next = [...images];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ ...value, images: next });
  };
  return (
    <div className="space-y-4">
      <LocalizedField label="Title" value={value.title} onChange={(v) => onChange({ ...value, title: v })} />
      <LocalizedField label="Subtitle" value={value.subtitle} onChange={(v) => onChange({ ...value, subtitle: v })} />
      <div>
        <Label className="text-xs">Columns</Label>
        <div className="mt-1 flex gap-1">
          {([2, 3, 4] as const).map((c) => (
            <button key={c} type="button" onClick={() => onChange({ ...value, columns: c })}
              className={`flex-1 rounded border px-2 py-1 text-xs ${cols === c ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background hover:bg-muted"}`}>{c}</button>
          ))}
        </div>
      </div>
      <div className="rounded border border-input p-3">
        <div className="mb-2 flex items-center justify-between">
          <Label className="text-xs font-semibold">Images</Label>
          <Button size="sm" variant="outline" onClick={() => onChange({ ...value, images: [...images, { src: "" }] })}>
            <Plus className="mr-1 h-3 w-3" /> Add image
          </Button>
        </div>
        <div className="space-y-3">
          {images.map((im, i) => (
            <div key={i} className="rounded border border-border bg-background p-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Image #{i + 1}</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => move(i, -1)} className="rounded p-1 hover:bg-muted" aria-label="Up"><ChevronUp className="h-3 w-3" /></button>
                  <button type="button" onClick={() => move(i, 1)} className="rounded p-1 hover:bg-muted" aria-label="Down"><ChevronDown className="h-3 w-3" /></button>
                  <button type="button" onClick={() => onChange({ ...value, images: images.filter((_, idx) => idx !== i) })} className="rounded p-1 text-muted-foreground hover:text-destructive" aria-label="Remove"><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>
              <ImagePicker label="Image" value={im.src} onChange={(v) => update(i, { src: v })} />
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <Input value={im.alt ?? ""} onChange={(e) => update(i, { alt: e.target.value })} placeholder="Alt text" />
                <Input value={im.href ?? ""} onChange={(e) => update(i, { href: e.target.value })} placeholder="Link (optional)" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------- Testimonials -------------------- */
function TestimonialsEditor({ value, onChange }: { value: TestimonialsSettings; onChange: (v: TestimonialsSettings) => void }) {
  const items = value.items ?? [];
  const update = (i: number, patch: Partial<TestimonialItem>) =>
    onChange({ ...value, items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });
  const move = (i: number, dir: -1 | 1) => {
    const next = [...items];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ ...value, items: next });
  };
  return (
    <div className="space-y-4">
      <LocalizedField label="Eyebrow" value={value.eyebrow} onChange={(v) => onChange({ ...value, eyebrow: v })} />
      <LocalizedField label="Title" value={value.title} onChange={(v) => onChange({ ...value, title: v })} />
      <div className="rounded border border-input p-3">
        <div className="mb-2 flex items-center justify-between">
          <Label className="text-xs font-semibold">Testimonials</Label>
          <Button size="sm" variant="outline" onClick={() => onChange({ ...value, items: [...items, { rating: 5 }] })}>
            <Plus className="mr-1 h-3 w-3" /> Add
          </Button>
        </div>
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="rounded border border-border bg-background p-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">#{i + 1}</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => move(i, -1)} className="rounded p-1 hover:bg-muted" aria-label="Up"><ChevronUp className="h-3 w-3" /></button>
                  <button type="button" onClick={() => move(i, 1)} className="rounded p-1 hover:bg-muted" aria-label="Down"><ChevronDown className="h-3 w-3" /></button>
                  <button type="button" onClick={() => onChange({ ...value, items: items.filter((_, idx) => idx !== i) })} className="rounded p-1 text-muted-foreground hover:text-destructive" aria-label="Remove"><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Textarea value={it.quoteId ?? ""} onChange={(e) => update(i, { quoteId: e.target.value })} placeholder="Quote (ID)" />
                <Textarea value={it.quoteEn ?? ""} onChange={(e) => update(i, { quoteEn: e.target.value })} placeholder="Quote (EN)" />
                <Input value={it.author ?? ""} onChange={(e) => update(i, { author: e.target.value })} placeholder="Author" />
                <Input value={it.role ?? ""} onChange={(e) => update(i, { role: e.target.value })} placeholder="Role / location" />
                <Input type="number" min={0} max={5} value={it.rating ?? 5} onChange={(e) => update(i, { rating: Number(e.target.value) || 0 })} placeholder="Rating (0-5)" />
              </div>
              <div className="mt-2">
                <ImagePicker label="Avatar (optional)" value={it.avatar} onChange={(v) => update(i, { avatar: v })} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------- Spacer -------------------- */
function SpacerEditor({ value, onChange }: { value: SpacerSettings; onChange: (v: SpacerSettings) => void }) {
  const h = value.height ?? 48;
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">Height — {h}px</Label>
        <Slider value={[h]} min={8} max={400} step={4} onValueChange={(vals) => onChange({ ...value, height: vals[0] ?? 48 })} className="mt-2" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!value.showDivider} onChange={(e) => onChange({ ...value, showDivider: e.target.checked })} />
        Show divider line
      </label>
    </div>
  );
}

/* -------------------- Announcement Bar -------------------- */
function AnnouncementBarEditor({ value, onChange }: { value: AnnouncementBarSettings; onChange: (v: AnnouncementBarSettings) => void }) {
  return (
    <div className="space-y-4">
      <LocalizedField label="Message" value={value.message} onChange={(v) => onChange({ ...value, message: v })} />
      <LocalizedField label="Link label (optional)" value={value.linkLabel} onChange={(v) => onChange({ ...value, linkLabel: v })} />
      <div>
        <Label className="text-xs">Link URL</Label>
        <Input value={value.href ?? ""} onChange={(e) => onChange({ ...value, href: e.target.value })} placeholder="/promo or https://…" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <ColorField label="Background" value={value.bgColor ?? ""} onChange={(v) => onChange({ ...value, bgColor: v || undefined })} />
        <ColorField label="Text" value={value.textColor ?? ""} onChange={(v) => onChange({ ...value, textColor: v || undefined })} />
      </div>
      <p className="text-[11px] text-muted-foreground">
        Edit it here. The storefront uses the first enabled announcement bar from Homepage Sections and renders it above the header.
      </p>
    </div>
  );
}

/* -------------------- Store Locator -------------------- */
function StoreLocatorEditor({ value, onChange }: { value: StoreLocatorSettings; onChange: (v: StoreLocatorSettings) => void }) {
  const items = value.stores ?? [];
  const update = (i: number, patch: Partial<StoreItem>) =>
    onChange({ ...value, stores: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });
  const move = (i: number, dir: -1 | 1) => {
    const next = [...items];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ ...value, stores: next });
  };
  return (
    <div className="space-y-4">
      <LocalizedField label="Eyebrow" value={value.eyebrow} onChange={(v) => onChange({ ...value, eyebrow: v })} />
      <LocalizedField label="Heading" value={value.title} onChange={(v) => onChange({ ...value, title: v })} />
      <LocalizedField label="Description" value={value.subtitle} onChange={(v) => onChange({ ...value, subtitle: v })} multiline />
      <CTAEditor label="CTA" value={value.cta} onChange={(v) => onChange({ ...value, cta: v })} />
      <div className="rounded border border-input p-3">
        <div className="mb-2 flex items-center justify-between">
          <Label className="text-xs font-semibold">Featured stores</Label>
          <Button size="sm" variant="outline" onClick={() => onChange({ ...value, stores: [...items, { city: "", address: "", phone: "" }] })}>
            <Plus className="mr-1 h-3 w-3" /> Add store
          </Button>
        </div>
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="rounded border border-border bg-background p-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Store #{i + 1}</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => move(i, -1)} className="rounded p-1 hover:bg-muted" aria-label="Up"><ChevronUp className="h-3 w-3" /></button>
                  <button type="button" onClick={() => move(i, 1)} className="rounded p-1 hover:bg-muted" aria-label="Down"><ChevronDown className="h-3 w-3" /></button>
                  <button type="button" onClick={() => onChange({ ...value, stores: items.filter((_, idx) => idx !== i) })} className="rounded p-1 text-muted-foreground hover:text-destructive" aria-label="Remove"><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <Input value={it.city} onChange={(e) => update(i, { city: e.target.value })} placeholder="City" />
                <Input value={it.address} onChange={(e) => update(i, { address: e.target.value })} placeholder="Address" />
                <Input value={it.phone} onChange={(e) => update(i, { phone: e.target.value })} placeholder="Phone" />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">Shown next to the heading. Manage the full store directory in Admin → Stores.</p>
      </div>
    </div>
  );
}

/* -------------------- FAQ (built-in) -------------------- */
function FaqEditor({ value, onChange }: { value: FaqSettings; onChange: (v: FaqSettings) => void }) {
  const items = value.items ?? [];
  const update = (i: number, patch: Partial<FaqItem>) =>
    onChange({ ...value, items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });
  const move = (i: number, dir: -1 | 1) => {
    const next = [...items];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ ...value, items: next });
  };
  return (
    <div className="space-y-4">
      <LocalizedField label="Eyebrow" value={value.eyebrow} onChange={(v) => onChange({ ...value, eyebrow: v })} />
      <LocalizedField label="Heading" value={value.title} onChange={(v) => onChange({ ...value, title: v })} />
      <LocalizedField label="Subtitle" value={value.subtitle} onChange={(v) => onChange({ ...value, subtitle: v })} />
      <div className="rounded border border-input p-3">
        <div className="mb-2 flex items-center justify-between">
          <Label className="text-xs font-semibold">Questions & answers</Label>
          <Button size="sm" variant="outline" onClick={() => onChange({ ...value, items: [...items, {}] })}>
            <Plus className="mr-1 h-3 w-3" /> Add
          </Button>
        </div>
        <p className="mb-2 text-[10px] text-muted-foreground">Leave empty to keep the built-in FAQ list.</p>
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="rounded border border-border bg-background p-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Q&A #{i + 1}</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => move(i, -1)} className="rounded p-1 hover:bg-muted" aria-label="Up"><ChevronUp className="h-3 w-3" /></button>
                  <button type="button" onClick={() => move(i, 1)} className="rounded p-1 hover:bg-muted" aria-label="Down"><ChevronDown className="h-3 w-3" /></button>
                  <button type="button" onClick={() => onChange({ ...value, items: items.filter((_, idx) => idx !== i) })} className="rounded p-1 text-muted-foreground hover:text-destructive" aria-label="Remove"><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input value={it.questionId ?? ""} onChange={(e) => update(i, { questionId: e.target.value })} placeholder="Pertanyaan (ID)" />
                <Input value={it.questionEn ?? ""} onChange={(e) => update(i, { questionEn: e.target.value })} placeholder="Question (EN)" />
                <Textarea value={it.answerId ?? ""} onChange={(e) => update(i, { answerId: e.target.value })} placeholder="Jawaban (ID)" />
                <Textarea value={it.answerEn ?? ""} onChange={(e) => update(i, { answerEn: e.target.value })} placeholder="Answer (EN)" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------- Contact -------------------- */
function ContactEditor({ value, onChange }: { value: ContactSettings; onChange: (v: ContactSettings) => void }) {
  // Seed contacts from legacy single email/phone if no list exists yet.
  const contacts =
    Array.isArray(value.contacts) && value.contacts.length > 0
      ? value.contacts
      : (value.email || value.phone)
        ? [{ email: value.email ?? "", phone: value.phone ?? "" }]
        : [{}];
  const updateContacts = (next: NonNullable<ContactSettings["contacts"]>) =>
    onChange({ ...value, contacts: next });
  const updateAt = (i: number, patch: Partial<NonNullable<ContactSettings["contacts"]>[number]>) => {
    const next = contacts.map((c, idx) => (idx === i ? { ...c, ...patch } : c));
    updateContacts(next);
  };
  return (
    <div className="space-y-4">
      <LocalizedField label="Eyebrow" value={value.eyebrow} onChange={(v) => onChange({ ...value, eyebrow: v })} />
      <LocalizedField label="Heading" value={value.title} onChange={(v) => onChange({ ...value, title: v })} />
      <LocalizedField label="Description" value={value.subtitle} onChange={(v) => onChange({ ...value, subtitle: v })} multiline />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Contact persons ({contacts.length}/3)</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={contacts.length >= 3}
            onClick={() => updateContacts([...contacts, {}])}
          >
            <Plus className="mr-1 h-3 w-3" /> Add
          </Button>
        </div>
        {contacts.map((c, i) => (
          <div key={i} className="space-y-2 rounded border border-input p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">#{i + 1}</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={contacts.length <= 1}
                onClick={() => updateContacts(contacts.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label className="text-[11px]">Name / label</Label>
                <Input value={c.name ?? ""} onChange={(e) => updateAt(i, { name: e.target.value })} placeholder="e.g. Customer Support" />
              </div>
              <div>
                <Label className="text-[11px]">Phone</Label>
                <Input value={c.phone ?? ""} onChange={(e) => updateAt(i, { phone: e.target.value })} placeholder="+62 …" />
              </div>
              <div>
                <Label className="text-[11px]">Role (optional)</Label>
                <Input value={c.role ?? ""} onChange={(e) => updateAt(i, { role: e.target.value })} placeholder="e.g. Sales" />
              </div>
              <div>
                <Label className="text-[11px]">Email (optional)</Label>
                <Input value={c.email ?? ""} onChange={(e) => updateAt(i, { email: e.target.value })} placeholder="hello@consina.com" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div>
        <Label className="text-xs">Address</Label>
        <Input value={value.address ?? ""} onChange={(e) => onChange({ ...value, address: e.target.value })} placeholder="Jakarta, Indonesia" />
      </div>
      <ContactSubjectsEditor
        subjects={value.subjects ?? []}
        onChange={(subjects) => onChange({ ...value, subjects })}
      />
      <p className="text-[11px] text-muted-foreground">Inquiries submitted from the form are saved to the contact_inquiries table.</p>
    </div>
  );
}

function ContactSubjectsEditor({
  subjects,
  onChange,
}: {
  subjects: NonNullable<ContactSettings["subjects"]>;
  onChange: (s: NonNullable<ContactSettings["subjects"]>) => void;
}) {
  const update = (i: number, patch: Partial<NonNullable<ContactSettings["subjects"]>[number]>) =>
    onChange(subjects.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const move = (i: number, dir: -1 | 1) => {
    const next = [...subjects];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="rounded border border-input p-3">
      <div className="mb-2 flex items-center justify-between">
        <Label className="text-xs font-semibold">Form subjects ({subjects.length})</Label>
        <Button size="sm" variant="outline" onClick={() => onChange([...subjects, { labelId: "", labelEn: "", value: "" }])}>
          <Plus className="mr-1 h-3 w-3" /> Add
        </Button>
      </div>
      <div className="space-y-2">
        {subjects.map((s, i) => (
          <div key={i} className="rounded border border-border bg-background p-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Subject #{i + 1}</span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => move(i, -1)} className="rounded p-1 hover:bg-muted" aria-label="Up"><ChevronUp className="h-3 w-3" /></button>
                <button type="button" onClick={() => move(i, 1)} className="rounded p-1 hover:bg-muted" aria-label="Down"><ChevronDown className="h-3 w-3" /></button>
                <button type="button" onClick={() => onChange(subjects.filter((_, idx) => idx !== i))} className="rounded p-1 text-muted-foreground hover:text-destructive" aria-label="Remove"><Trash2 className="h-3 w-3" /></button>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Input value={s.labelId ?? ""} onChange={(e) => update(i, { labelId: e.target.value })} placeholder="Label (ID)" className="h-8 text-xs" />
              <Input value={s.labelEn ?? ""} onChange={(e) => update(i, { labelEn: e.target.value })} placeholder="Label (EN)" className="h-8 text-xs" />
              <Input value={s.value ?? ""} onChange={(e) => update(i, { value: e.target.value })} placeholder="Value (optional)" className="h-8 text-xs" />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">Leave empty to use the built-in 5 subjects.</p>
    </div>
  );
}

/* -------------------- Custom Section -------------------- */
function CustomEditor({ value, onChange }: { value: CustomSectionSettings; onChange: (v: CustomSectionSettings) => void }) {
  const pos = value.imagePosition ?? "right";
  const overlay = value.overlay ?? 35;
  // Seed slides from legacy single `image` on first edit so existing content carries over.
  const slides = value.slides && value.slides.length > 0
    ? value.slides
    : value.image
      ? [{ image: value.image, href: value.imageHref }]
      : [];
  const interval = typeof value.intervalMs === "number" ? value.intervalMs : 2000;
  const updateSlide = (i: number, patch: Partial<{ image: string; href?: string; alt?: string }>) =>
    onChange({ ...value, slides: slides.map((sl, idx) => (idx === i ? { ...sl, ...patch } : sl)) });
  const moveSlide = (i: number, dir: -1 | 1) => {
    const next = [...slides];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ ...value, slides: next });
  };
  return (
    <div className="space-y-4">
      <div className="rounded border border-input p-3">
        <div className="mb-2 flex items-center justify-between">
          <Label className="text-xs font-semibold">Slides</Label>
          <Button size="sm" variant="outline" onClick={() => onChange({ ...value, slides: [...slides, { image: "" }] })}>
            <Plus className="mr-1 h-3 w-3" /> Add slide
          </Button>
        </div>
        <p className="mb-2 text-[11px] text-muted-foreground">Add 2+ slides to auto-activate carousel mode (autoplay, swipe, arrows, dots). With 1 slide, renders as a single image.</p>
        <div className="space-y-3">
          {slides.map((sl, i) => (
            <div key={i} className="rounded border border-border bg-background p-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Slide #{i + 1}</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => moveSlide(i, -1)} className="rounded p-1 hover:bg-muted" aria-label="Up"><ChevronUp className="h-3 w-3" /></button>
                  <button type="button" onClick={() => moveSlide(i, 1)} className="rounded p-1 hover:bg-muted" aria-label="Down"><ChevronDown className="h-3 w-3" /></button>
                  <button type="button" onClick={() => onChange({ ...value, slides: slides.filter((_, idx) => idx !== i) })} className="rounded p-1 text-muted-foreground hover:text-destructive" aria-label="Remove"><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>
              <ImagePicker label="Image" value={sl.image} onChange={(v) => updateSlide(i, { image: v })} />
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <Input value={sl.alt ?? ""} onChange={(e) => updateSlide(i, { alt: e.target.value })} placeholder="Alt text (optional)" />
                <Input value={sl.href ?? ""} onChange={(e) => updateSlide(i, { href: e.target.value })} placeholder="Link URL (optional)" />
              </div>
            </div>
          ))}
          {slides.length === 0 && (
            <p className="text-[11px] text-muted-foreground">No slides yet. Add at least one image.</p>
          )}
        </div>
      </div>
      {slides.length > 1 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Aspect ratio</Label>
            <div className="mt-1 flex gap-1">
              {(["16:9", "4:3", "1:1"] as const).map((r) => {
                const active = (value.aspectRatio ?? "16:9") === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onChange({ ...value, aspectRatio: r })}
                    className={`flex-1 rounded border px-2 py-1 text-xs ${active ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background hover:bg-muted"}`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Label className="text-xs">Auto-advance interval (seconds)</Label>
            <Input
              type="number"
              min={1}
              max={10}
              step={1}
              className="mt-1 w-28"
              value={Math.max(1, Math.round((interval || 2000) / 1000))}
              onChange={(e) => {
                const n = Math.max(1, Math.min(10, Number(e.target.value) || 2));
                onChange({ ...value, intervalMs: n * 1000 });
              }}
            />
          </div>
        </div>
      )}
      <div>
        <Label className="text-xs">Image position</Label>
        <div className="mt-1 flex gap-1">
          {(["left", "right", "background"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange({ ...value, imagePosition: p })}
              className={`flex-1 rounded border px-2 py-1 text-xs font-semibold capitalize ${
                pos === p ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background hover:bg-muted"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      {pos === "background" && (
        <div>
          <Label className="text-xs">Overlay darkness — {overlay}%</Label>
          <Slider value={[overlay]} min={0} max={100} step={5} onValueChange={(vals) => onChange({ ...value, overlay: vals[0] ?? 0 })} className="mt-2" />
        </div>
      )}
      <LocalizedField label="Eyebrow" value={value.eyebrow} onChange={(v) => onChange({ ...value, eyebrow: v })} />
      <LocalizedField label="Heading" value={value.heading} onChange={(v) => onChange({ ...value, heading: v })} />
      <LocalizedField label="Description" value={value.body} onChange={(v) => onChange({ ...value, body: v })} multiline />
      <CTAEditor label="CTA button" value={value.cta} onChange={(v) => onChange({ ...value, cta: v })} />
    </div>
  );
}

function VideoYoutubeEditor({ value, onChange }: { value: VideoYoutubeSettings; onChange: (v: VideoYoutubeSettings) => void }) {
  const mode = value.mode ?? "manual";
  const align = value.alignment ?? "center";
  const aspect = value.aspectRatio ?? "16:9";
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">Source</Label>
        <div className="mt-1 inline-flex rounded-md border border-border overflow-hidden text-xs">
          {(["manual", "auto_latest"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onChange({ ...value, mode: m })}
              className={`px-3 py-1.5 ${mode === m ? "bg-foreground text-background" : "bg-background"}`}
            >
              {m === "manual" ? "Manual URL" : "Auto-latest from channel"}
            </button>
          ))}
        </div>
      </div>

      {mode === "manual" ? (
        <div>
          <Label className="text-xs">YouTube URL or video ID</Label>
          <Input
            value={value.videoUrl ?? ""}
            placeholder="https://www.youtube.com/watch?v=... or 11-char ID"
            onChange={(e) => onChange({ ...value, videoUrl: e.target.value })}
            className="mt-1"
          />
        </div>
      ) : (
        <div>
          <Label className="text-xs">YouTube Channel ID</Label>
          <Input
            value={value.channelId ?? ""}
            placeholder="UCxxxxxxxxxxxxxxxxxxxxxx"
            onChange={(e) => onChange({ ...value, channelId: e.target.value })}
            className="mt-1"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Latest public video is fetched server-side (1-hour cache). Requires the YOUTUBE_API_KEY secret.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Aspect ratio</Label>
          <select
            value={aspect}
            onChange={(e) => onChange({ ...value, aspectRatio: e.target.value as "16:9" | "4:3" | "1:1" })}
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          >
            <option value="16:9">16:9</option>
            <option value="4:3">4:3</option>
            <option value="1:1">1:1</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Text alignment</Label>
          <select
            value={align}
            onChange={(e) => onChange({ ...value, alignment: e.target.value as "left" | "center" | "right" })}
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={!!value.autoplay}
          onChange={(e) => onChange({ ...value, autoplay: e.target.checked })}
        />
        Autoplay (muted)
      </label>

      <LocalizedField label="Eyebrow" value={value.eyebrow} onChange={(v) => onChange({ ...value, eyebrow: v })} />
      <LocalizedField label="Heading" value={value.heading} onChange={(v) => onChange({ ...value, heading: v })} />
      <LocalizedField label="Description" value={value.body} onChange={(v) => onChange({ ...value, body: v })} multiline />
    </div>
  );
}
