import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  GripVertical,
  Loader2,
  Monitor,
  Plus,
  RefreshCcw,
  RotateCcw,
  Smartphone,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SectionSettingsEditor } from "@/components/admin/SectionSettingsEditor";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_HOME_SECTIONS,
  SECTION_REGISTRY,
  SECTION_TYPE_LIST,
  getDefaultSettings,
  mergeSettings,
  type PageSectionRow,
  type SectionTypeId,
} from "@/lib/section-registry";
import {
  DEFAULT_THEME,
  DEFAULT_HEADER,
  DEFAULT_FOOTER,
  FONT_OPTIONS,
  mergeTheme,
  fontFormatFromUrl,
  type ThemeSettings,
  type CustomFont,
  type NavLink,
  type FooterColumn,
} from "@/lib/theme-defaults";

export const Route = createFileRoute("/admin/design")({
  component: DesignPage,
});

const PAGE = "home";

function DesignPage() {
  return (
    <AdminShell>
      <DesignEditor />
    </AdminShell>
  );
}

function DesignEditor() {
  const [sections, setSections] = useState<PageSectionRow[]>([]);
  const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const [tab, setTab] = useState<"sections" | "header" | "footer" | "theme">("sections");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewKey, setPreviewKey] = useState(0);
  const previewRef = useRef<HTMLIFrameElement | null>(null);

  const bumpPreview = () => {
    // Soft refresh: postMessage triggers useSiteSettings reload + React Query refetches via reload.
    try {
      previewRef.current?.contentWindow?.postMessage({ type: "lovable-theme-refresh" }, "*");
    } catch {
      // ignore cross-origin
    }
    // Hard reload as fallback (page_sections changes need a re-fetch on mount).
    setPreviewKey((k) => k + 1);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const load = async () => {
    setLoading(true);
    const [{ data: secs }, { data: th }] = await Promise.all([
      supabase
        .from("page_sections")
        .select("id,page,section_type,position,enabled,settings")
        .eq("page", PAGE)
        .order("position", { ascending: true }),
      supabase.from("theme_settings").select("settings").eq("id", "global").maybeSingle(),
    ]);

    if (!secs || secs.length === 0) {
      // Seed defaults so editor matches the live storefront.
      const seedRows = DEFAULT_HOME_SECTIONS.map((type, i) => ({
        page: PAGE,
        section_type: type,
        position: i,
        enabled: true,
        settings: getDefaultSettings(type) as never,
      }));
      const { data: inserted } = await supabase
        .from("page_sections")
        .insert(seedRows)
        .select("id,page,section_type,position,enabled,settings");
      setSections((inserted ?? []) as PageSectionRow[]);
    } else {
      // Backfill any missing default sections (e.g. store_locator / contact
      // on legacy installs) so every editable section is reachable.
      const existing = new Set((secs as PageSectionRow[]).map((r) => r.section_type));
      const missing = DEFAULT_HOME_SECTIONS.filter((t) => !existing.has(t));
      if (missing.length > 0) {
        const maxPos = (secs as PageSectionRow[]).reduce(
          (m, r) => Math.max(m, r.position ?? 0),
          -1,
        );
        const addRows = missing.map((type, i) => ({
          page: PAGE,
          section_type: type,
          position: maxPos + 1 + i,
          enabled: true,
          settings: getDefaultSettings(type) as never,
        }));
        const { data: inserted } = await supabase
          .from("page_sections")
          .insert(addRows)
          .select("id,page,section_type,position,enabled,settings");
        setSections([
          ...(secs as PageSectionRow[]),
          ...((inserted ?? []) as PageSectionRow[]),
        ]);
      } else {
        setSections(secs as PageSectionRow[]);
      }
    }
    setTheme(mergeTheme(th?.settings));
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const selected = useMemo(
    () => sections.find((s) => s.id === selectedId) ?? null,
    [sections, selectedId],
  );

  const persistOrder = async (next: PageSectionRow[]) => {
    setSections(next);
    await Promise.all(
      next.map((s, i) =>
        supabase.from("page_sections").update({ position: i }).eq("id", s.id),
      ),
    );
    bumpPreview();
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = sections.findIndex((s) => s.id === active.id);
    const newIdx = sections.findIndex((s) => s.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = [...sections];
    const [moved] = next.splice(oldIdx, 1);
    next.splice(newIdx, 0, moved);
    void persistOrder(next.map((s, i) => ({ ...s, position: i })));
  };

  const toggleEnabled = async (row: PageSectionRow) => {
    const next = !row.enabled;
    setSections((cur) => cur.map((s) => (s.id === row.id ? { ...s, enabled: next } : s)));
    const { error } = await supabase
      .from("page_sections")
      .update({ enabled: next })
      .eq("id", row.id);
    if (error) toast.error("Failed to update section");
    else bumpPreview();
  };

  const duplicate = async (row: PageSectionRow) => {
    const insertPos = row.position + 1;
    const { data, error } = await supabase
      .from("page_sections")
      .insert({
        page: row.page,
        section_type: row.section_type,
        position: insertPos,
        enabled: row.enabled,
        settings: (row.settings ?? {}) as never,
      })
      .select("id,page,section_type,position,enabled,settings")
      .single();
    if (error || !data) {
      toast.error("Failed to duplicate");
      return;
    }
    const next = [...sections];
    next.splice(insertPos, 0, data as PageSectionRow);
    void persistOrder(next.map((s, i) => ({ ...s, position: i })));
    toast.success("Section duplicated");
    bumpPreview();
  };

  const remove = async (row: PageSectionRow) => {
    if (!confirm(`Remove "${SECTION_REGISTRY[row.section_type as SectionTypeId]?.label ?? row.section_type}"?`)) return;
    const { error } = await supabase.from("page_sections").delete().eq("id", row.id);
    if (error) {
      toast.error("Failed to remove");
      return;
    }
    const next = sections.filter((s) => s.id !== row.id);
    void persistOrder(next.map((s, i) => ({ ...s, position: i })));
    if (selectedId === row.id) setSelectedId(null);
    bumpPreview();
  };

  const addSection = async (type: SectionTypeId) => {
    const pos = sections.length;
    const { data, error } = await supabase
      .from("page_sections")
      .insert({
        page: PAGE,
        section_type: type,
        position: pos,
        enabled: true,
        settings: getDefaultSettings(type) as never,
      })
      .select("id,page,section_type,position,enabled,settings")
      .single();
    if (error || !data) {
      toast.error("Failed to add section");
      return;
    }
    setSections((cur) => [...cur, data as PageSectionRow]);
    setAddOpen(false);
    setSelectedId(data.id);
    bumpPreview();
  };

  const resetSections = async () => {
    if (!confirm("Reset homepage sections to the default layout? This removes any custom sections.")) return;
    await supabase.from("page_sections").delete().eq("page", PAGE);
    setSections([]);
    setSelectedId(null);
    await load();
    toast.success("Sections reset to default");
    bumpPreview();
  };

  const saveTheme = async (next: ThemeSettings) => {
    setSavingTheme(true);
    setTheme(next);
    const { error } = await supabase
      .from("theme_settings")
      .upsert({ id: "global", settings: next as never });
    setSavingTheme(false);
    if (error) toast.error("Failed to save theme");
    else bumpPreview();
  };

  const resetTheme = async () => {
    if (!confirm("Reset global theme to defaults?")) return;
    await supabase.from("theme_settings").delete().eq("id", "global");
    setTheme(DEFAULT_THEME);
    // Persist defaults so other clients pick up cleared values.
    await supabase.from("theme_settings").upsert({ id: "global", settings: DEFAULT_THEME as never });
    toast.success("Theme reset");
    bumpPreview();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading editor…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Design</h1>
          <p className="text-sm text-muted-foreground">
            Compose the homepage, tune the header & footer, and adjust the theme — with live preview.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={bumpPreview} title="Refresh preview">
            <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> Refresh
          </Button>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary hover:bg-muted"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open storefront
          </a>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[440px_1fr]">
        {/* LEFT: editor pane */}
        <div className="space-y-4 rounded-lg border border-border bg-white p-4">
          {/* Tabs */}
          <div className="flex gap-1 rounded-md bg-muted p-1 text-xs font-semibold uppercase tracking-wider">
            {([
              ["sections", "Sections"],
              ["header", "Header"],
              ["footer", "Footer"],
              ["theme", "Theme"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 rounded px-2 py-1.5 transition ${
                  tab === key ? "bg-white text-primary shadow-sm" : "text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "sections" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Homepage sections
                </h2>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={resetSections}>
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
                  </Button>
                  <div className="relative">
                    <Button size="sm" onClick={() => setAddOpen((o) => !o)}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> Add
                    </Button>
                    {addOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setAddOpen(false)} />
                        <div className="absolute right-0 z-40 mt-1 w-72 max-h-[60vh] overflow-y-auto rounded-md border border-border bg-white shadow-lg">
                          {SECTION_TYPE_LIST.map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => void addSection(d.id)}
                              className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                            >
                              <div className="font-medium">{d.label}</div>
                              <div className="text-xs text-muted-foreground">{d.description}</div>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Fixed Header pseudo-row */}
              <FixedRow label="Header" sublabel="Logo, nav visibility" onClick={() => setTab("header")} />

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  <ul className="space-y-1.5">
                    {sections.map((row) => (
                      <SectionRow
                        key={row.id}
                        row={row}
                        selected={row.id === selectedId}
                        onSelect={() => setSelectedId(row.id)}
                        onToggle={() => void toggleEnabled(row)}
                        onDuplicate={() => void duplicate(row)}
                        onRemove={() => void remove(row)}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>

              {/* Fixed Footer pseudo-row */}
              <FixedRow label="Footer" sublabel="Tagline, links, socials" onClick={() => setTab("footer")} />

              {selected && (
                <SectionSettings
                  row={selected}
                  onChange={(next) => {
                    setSections((cur) =>
                      cur.map((s) => (s.id === selected.id ? { ...s, settings: next } : s)),
                    );
                  }}
                  onSave={async (next) => {
                    const { error } = await supabase
                      .from("page_sections")
                      .update({ settings: next as never })
                      .eq("id", selected.id);
                    if (error) toast.error("Failed to save section");
                    else {
                      toast.success("Section saved");
                      bumpPreview();
                    }
                  }}
                  onResetToDefault={async () => {
                    if (!confirm("Reset this section's settings to default?")) return;
                    const def = getDefaultSettings(selected.section_type as SectionTypeId);
                    const { error } = await supabase
                      .from("page_sections")
                      .update({ settings: def as never })
                      .eq("id", selected.id);
                    if (error) {
                      toast.error("Failed to reset");
                      return;
                    }
                    setSections((cur) =>
                      cur.map((s) =>
                        s.id === selected.id
                          ? { ...s, settings: def as unknown as Record<string, unknown> }
                          : s,
                      ),
                    );
                    toast.success("Section reset to default");
                    bumpPreview();
                  }}
                />
              )}
            </div>
          )}

          {tab === "header" && (
            <HeaderPanel
              theme={theme}
              saving={savingTheme}
              onChange={(t) => void saveTheme(t)}
              onReset={async () => {
                await saveTheme({ ...theme, header: DEFAULT_HEADER });
                toast.success("Header reset");
              }}
            />
          )}

          {tab === "footer" && (
            <FooterPanel
              theme={theme}
              saving={savingTheme}
              onChange={(t) => void saveTheme(t)}
              onReset={async () => {
                await saveTheme({ ...theme, footer: DEFAULT_FOOTER });
                toast.success("Footer reset");
              }}
            />
          )}

          {tab === "theme" && (
            <ThemePanel
              theme={theme}
              saving={savingTheme}
              onChange={(t) => void saveTheme(t)}
              onReset={() => void resetTheme()}
            />
          )}
        </div>

        {/* RIGHT: live preview */}
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Live preview
            </h2>
            <div className="flex items-center gap-1 rounded-md bg-white p-1 shadow-sm">
              <button
                onClick={() => setDevice("desktop")}
                className={`flex h-7 w-9 items-center justify-center rounded ${
                  device === "desktop" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
                aria-label="Desktop preview"
              >
                <Monitor className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setDevice("mobile")}
                className={`flex h-7 w-9 items-center justify-center rounded ${
                  device === "mobile" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
                aria-label="Mobile preview"
              >
                <Smartphone className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="flex justify-center overflow-hidden rounded-md bg-white">
            <iframe
              ref={previewRef}
              key={previewKey}
              src="/"
              title="Storefront preview"
              className="border-0 bg-white"
              style={{
                width: device === "mobile" ? 390 : "100%",
                height: "min(82vh, 1100px)",
                maxWidth: "100%",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FixedRow({ label, sublabel, onClick }: { label: string; sublabel: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-2 py-2 text-left text-sm hover:border-primary"
    >
      <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 text-[10px] font-bold uppercase tracking-wider text-primary">
        Fix
      </div>
      <div className="flex-1">
        <div className="font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{sublabel}</div>
      </div>
    </button>
  );
}

function SectionRow({
  row,
  selected,
  onSelect,
  onToggle,
  onDuplicate,
  onRemove,
}: {
  row: PageSectionRow;
  selected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const def = SECTION_REGISTRY[row.section_type as SectionTypeId];
  const label = def?.label ?? row.section_type;
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-md border bg-card px-2 py-2 text-sm ${
        selected ? "border-primary" : "border-border"
      }`}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 text-left"
      >
        <div className={`font-medium ${row.enabled ? "" : "text-muted-foreground line-through"}`}>
          {label}
        </div>
        <div className="text-xs text-muted-foreground">{row.section_type}</div>
      </button>
      <button
        type="button"
        onClick={onToggle}
        title={row.enabled ? "Disable" : "Enable"}
        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {row.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </button>
      <button
        type="button"
        onClick={onDuplicate}
        title="Duplicate"
        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Copy className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        title="Remove"
        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

function SectionSettings({
  row,
  onChange,
  onSave,
  onResetToDefault,
}: {
  row: PageSectionRow;
  onChange: (next: Record<string, unknown>) => void;
  onSave: (next: Record<string, unknown>) => Promise<void>;
  onResetToDefault: () => Promise<void>;
}) {
  const def = SECTION_REGISTRY[row.section_type as SectionTypeId];
  const type = row.section_type as SectionTypeId;
  const merged = mergeSettings(type, row.settings ?? {}) as unknown as Record<string, unknown>;
  return (
    <div className="mt-4 rounded-md border border-dashed border-border bg-muted/30 p-4 text-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="font-semibold">{def?.label ?? type} settings</div>
          <p className="text-xs text-muted-foreground">{def?.description}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => void onResetToDefault()}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
          </Button>
          <Button size="sm" onClick={() => void onSave(merged)}>
            Save
          </Button>
        </div>
      </div>
      <SectionSettingsEditor
        type={type}
        value={merged}
        onChange={(next) => onChange(next)}
      />
    </div>
  );
}

function ThemePanel({
  theme,
  saving,
  onChange,
  onReset,
}: {
  theme: ThemeSettings;
  saving: boolean;
  onChange: (t: ThemeSettings) => void;
  onReset: () => void;
}) {
  const set = <K extends keyof ThemeSettings>(group: K, key: string, value: string) => {
    onChange({
      ...theme,
      [group]: { ...(theme[group] as Record<string, string>), [key]: value },
    });
  };

  return (
    <aside className="space-y-5 rounded-lg border border-border bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Tema (global)
        </h2>
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>

      <div className="space-y-3">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Colors</Label>
        {(["background", "foreground", "primary", "secondary", "accent"] as const).map((k) => (
          <ColorRow
            key={k}
            label={k}
            value={theme.colors[k]}
            onChange={(v) => set("colors", k, v)}
          />
        ))}
      </div>

      <div className="space-y-3">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Typography</Label>
        <FontRow
          label="Heading"
          value={theme.fonts.heading}
          onChange={(v) => set("fonts", "heading", v)}
          customFonts={theme.customFonts}
        />
        <FontRow
          label="Body"
          value={theme.fonts.body}
          onChange={(v) => set("fonts", "body", v)}
          customFonts={theme.customFonts}
        />
        <CustomFontsManager
          fonts={theme.customFonts}
          onChange={(next) => onChange({ ...theme, customFonts: next })}
        />
      </div>

      <Button variant="outline" size="sm" onClick={onReset} className="w-full">
        <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset theme
      </Button>
    </aside>
  );
}

// oklch values aren't supported by <input type="color"> directly, so we let
// users edit the raw token string. Most palettes are oklch in this project.
function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium capitalize">{label}</span>
        <span
          className="h-5 w-10 rounded border border-border"
          style={{ background: value }}
          aria-hidden
        />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="w-full rounded-md border border-input bg-background px-2 py-1 font-mono text-xs"
      />
    </div>
  );
}

function FontRow({
  label,
  value,
  onChange,
  customFonts,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  customFonts?: CustomFont[];
}) {
  return (
    <div>
      <span className="mb-1 block text-xs font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
      >
        <optgroup label="Curated">
          {FONT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </optgroup>
        {customFonts && customFonts.length > 0 && (
          <optgroup label="Custom">
            {customFonts.map((f) => (
              <option key={f.id} value={f.name}>
                {f.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      <span className="mt-1 block text-xs text-muted-foreground" style={{ fontFamily: value }}>
        The quick brown fox jumps over the lazy dog.
      </span>
    </div>
  );
}

function CustomFontsManager({
  fonts,
  onChange,
}: {
  fonts: CustomFont[];
  onChange: (next: CustomFont[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState("");

  const handleFile = async (file: File) => {
    const family = name.trim() || file.name.replace(/\.[^.]+$/, "");
    if (!family) {
      toast.error("Give the font a name first");
      return;
    }
    if (fonts.some((f) => f.name.toLowerCase() === family.toLowerCase())) {
      toast.error("A custom font with that name already exists");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Font file must be under 5MB");
      return;
    }
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!["woff2", "woff", "ttf", "otf"].includes(ext)) {
      toast.error("Use woff2, woff, ttf, or otf");
      return;
    }
    setUploading(true);
    const path = `site/fonts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const contentType =
      ext === "woff2"
        ? "font/woff2"
        : ext === "woff"
          ? "font/woff"
          : ext === "otf"
            ? "font/otf"
            : "font/ttf";
    const { error } = await supabase.storage
      .from("category-images")
      .upload(path, file, { cacheControl: "31536000", upsert: false, contentType });
    if (error) {
      setUploading(false);
      toast.error(error.message || "Upload failed");
      return;
    }
    const { data } = supabase.storage.from("category-images").getPublicUrl(path);
    const next: CustomFont = {
      id: crypto.randomUUID(),
      name: family,
      url: data.publicUrl,
      format: fontFormatFromUrl(data.publicUrl),
    };
    onChange([...fonts, next]);
    setName("");
    setUploading(false);
    toast.success(`Uploaded "${family}"`);
  };

  return (
    <div className="space-y-2 rounded-md border border-dashed border-border bg-muted/30 p-3">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
        Custom fonts
      </Label>
      <p className="text-xs text-muted-foreground">
        Upload your own font file (woff2 recommended). It becomes selectable above and is
        preloaded server-side for first paint. A safe system font is used as fallback.
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="Font name (e.g. Acme Sans)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 text-xs"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="mr-1.5 h-3.5 w-3.5" />
          )}
          Upload
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
      {fonts.length > 0 && (
        <ul className="space-y-1">
          {fonts.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-2 rounded border border-border bg-card px-2 py-1.5 text-xs"
            >
              <span style={{ fontFamily: `"${f.name}", system-ui` }} className="truncate">
                {f.name}{" "}
                <span className="text-muted-foreground">· {f.format}</span>
              </span>
              <button
                type="button"
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                onClick={() => {
                  if (!confirm(`Remove font "${f.name}"?`)) return;
                  onChange(fonts.filter((x) => x.id !== f.id));
                }}
                title="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Switch is imported for future per-section settings; keep tree-shake friendly
void Switch;

function HeaderPanel({
  theme,
  saving,
  onChange,
  onReset,
}: {
  theme: ThemeSettings;
  saving: boolean;
  onChange: (t: ThemeSettings) => void;
  onReset: () => void;
}) {
  const h = theme.header;
  const set = (key: keyof typeof h, value: string | boolean) =>
    onChange({ ...theme, header: { ...h, [key]: value } });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Header
        </h2>
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>
      <div>
        <Label className="text-xs">Logo text</Label>
        <Input value={h.logoText} onChange={(e) => set("logoText", e.target.value)} />
        <p className="mt-1 text-xs text-muted-foreground">Used as the alt text and as a fallback when no logo image is uploaded.</p>
      </div>
      <LogoUploader
        label="Header logo image"
        helper="Recommended: transparent PNG/SVG, ~200×60px. Leave empty to show the text logo."
        value={h.logoUrl}
        onChange={(url) => set("logoUrl", url)}
      />
      <div>
        <Label className="text-xs">Background color</Label>
        <div className="mt-1 flex items-center gap-2">
          <input
            type="color"
            value={/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h.bgColor) ? h.bgColor : "#ffffff"}
            onChange={(e) => set("bgColor", e.target.value)}
            className="h-8 w-10 cursor-pointer rounded border border-input bg-transparent"
          />
          <Input
            placeholder="(default — theme background)"
            value={h.bgColor}
            onChange={(e) => set("bgColor", e.target.value)}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Solid color shown behind the nav. Leave empty to use the theme background.
        </p>
      </div>
      <div>
        <Label className="text-xs">Link color</Label>
        <div className="mt-1 flex items-center gap-2">
          <input
            type="color"
            value={/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h.linkColor) ? h.linkColor : "#000000"}
            onChange={(e) => set("linkColor", e.target.value)}
            className="h-8 w-10 cursor-pointer rounded border border-input bg-transparent"
          />
          <Input
            placeholder="(default)"
            value={h.linkColor}
            onChange={(e) => set("linkColor", e.target.value)}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Color for the main nav links. Empty = theme default.</p>
      </div>
      {([
        ["showSinceTag", "Show 'Since 1999' tag"],
        ["showSearch", "Show search icon"],
        ["showFindStore", "Show Find a Store button"],
        ["showWishlist", "Show wishlist icon"],
        ["showAccount", "Show account icon"],
      ] as const).map(([k, label]) => (
        <label key={k} className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm">
          <span>{label}</span>
          <Switch checked={h[k] as boolean} onCheckedChange={(v) => set(k, !!v)} />
        </label>
      ))}
      <NavLinkListEditor
        label="Navigation links"
        helper="Main desktop & mobile nav links (shown after the Shop dropdown)."
        value={h.navLinks ?? []}
        onChange={(navLinks) => onChange({ ...theme, header: { ...h, navLinks } })}
      />
      <Button variant="outline" size="sm" onClick={onReset} className="w-full">
        <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset header
      </Button>
    </div>
  );
}

function FooterPanel({
  theme,
  saving,
  onChange,
  onReset,
}: {
  theme: ThemeSettings;
  saving: boolean;
  onChange: (t: ThemeSettings) => void;
  onReset: () => void;
}) {
  const f = theme.footer;
  const setField = (next: Partial<typeof f>) =>
    onChange({ ...theme, footer: { ...f, ...next } });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Footer
        </h2>
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Tagline (ID)</Label>
          <Input value={f.tagline.id} onChange={(e) => setField({ tagline: { ...f.tagline, id: e.target.value } })} />
        </div>
        <div>
          <Label className="text-xs">Tagline (EN)</Label>
          <Input value={f.tagline.en} onChange={(e) => setField({ tagline: { ...f.tagline, en: e.target.value } })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Blurb (ID)</Label>
          <Textarea rows={3} value={f.blurb.id} onChange={(e) => setField({ blurb: { ...f.blurb, id: e.target.value } })} />
        </div>
        <div>
          <Label className="text-xs">Blurb (EN)</Label>
          <Textarea rows={3} value={f.blurb.en} onChange={(e) => setField({ blurb: { ...f.blurb, en: e.target.value } })} />
        </div>
      </div>

      {([
        ["bgColor", "Background color", "(default)"],
        ["textColor", "Text color", "(default)"],
        ["taglineColor", "Tagline color", "(default — accent)"],
        ["headingColor", "Column heading color", "(default — accent)"],
        ["linkColor", "Link color", "(default — inherits text)"],
      ] as const).map(([key, label, placeholder]) => (
        <div key={key}>
          <Label className="text-xs">{label}</Label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="color"
              value={/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(f[key]) ? f[key] : "#000000"}
              onChange={(e) => setField({ [key]: e.target.value } as Partial<typeof f>)}
              className="h-8 w-10 cursor-pointer rounded border border-input bg-transparent"
            />
            <Input placeholder={placeholder} value={f[key]} onChange={(e) => setField({ [key]: e.target.value } as Partial<typeof f>)} />
          </div>
        </div>
      ))}

      <div className="space-y-3 rounded-md border border-dashed border-border bg-muted/30 p-3">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Footer logos</Label>
        <LogoUploader
          label="Footer logo (light / white version)"
          helper="Used on the dark green footer. Falls back to the dark logo, then header logo, then text."
          value={f.logoLightUrl}
          onChange={(url) => setField({ logoLightUrl: url })}
        />
        <LogoUploader
          label="Footer logo (dark / colored version)"
          helper="Optional. Used if no light version is uploaded."
          value={f.logoUrl}
          onChange={(url) => setField({ logoUrl: url })}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Social links</Label>
        {(["instagram", "facebook", "youtube"] as const).map((key) => (
          <div key={key}>
            <Label className="text-xs capitalize">{key}</Label>
            <Input
              placeholder="https://… (empty to hide)"
              value={f.socials[key]}
              onChange={(e) => setField({ socials: { ...f.socials, [key]: e.target.value } })}
            />
          </div>
        ))}
      </div>

      <FooterColumnsEditor
        value={f.columns ?? []}
        onChange={(columns) => setField({ columns })}
      />

      <NavLinkListEditor
        label="Legal / bottom links"
        helper="Shown at the bottom (Privacy, Terms, Cookies)."
        value={f.legalLinks ?? []}
        onChange={(legalLinks) => setField({ legalLinks })}
      />

      <Button variant="outline" size="sm" onClick={onReset} className="w-full">
        <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset footer
      </Button>
    </div>
  );
}

function LogoUploader({
  label,
  helper,
  value,
  onChange,
}: {
  label: string;
  helper?: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2MB");
      return;
    }
    setUploading(true);
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `site/logo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage
      .from("category-images")
      .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
    if (error) {
      setUploading(false);
      toast.error(error.message || "Upload failed");
      return;
    }
    const { data } = supabase.storage.from("category-images").getPublicUrl(path);
    onChange(data.publicUrl);
    setUploading(false);
    toast.success("Logo uploaded");
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-28 items-center justify-center overflow-hidden rounded border border-border bg-muted/40">
          {value ? (
            <img src={value} alt="" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">No logo</span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="flex gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="mr-1.5 h-3.5 w-3.5" />
              )}
              Upload
            </Button>
            {value && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onChange("")}
                title="Remove logo"
              >
                <X className="mr-1 h-3.5 w-3.5" /> Remove
              </Button>
            )}
          </div>
          <Input
            placeholder="Or paste an image URL"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-7 text-xs"
          />
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}

function NavLinkListEditor({
  label,
  helper,
  value,
  onChange,
}: {
  label: string;
  helper?: string;
  value: NavLink[];
  onChange: (next: NavLink[]) => void;
}) {
  const update = (i: number, patch: Partial<NavLink>) => {
    const next = value.map((it, idx) => (idx === i ? { ...it, ...patch } : it));
    onChange(next);
  };
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = value.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const add = () =>
    onChange([...value, { labelId: "", labelEn: "", href: "/" }]);
  return (
    <div className="space-y-2 rounded-md border border-dashed border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
        <Button type="button" size="sm" variant="outline" onClick={add}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add
        </Button>
      </div>
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
      {value.length === 0 && (
        <p className="text-xs text-muted-foreground">No links yet.</p>
      )}
      <ul className="space-y-2">
        {value.map((it, i) => (
          <li key={i} className="space-y-1.5 rounded border border-border bg-card p-2">
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Label (ID)"
                value={it.labelId}
                onChange={(e) => update(i, { labelId: e.target.value })}
                className="h-8 text-xs"
              />
              <Input
                placeholder="Label (EN)"
                value={it.labelEn}
                onChange={(e) => update(i, { labelEn: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
            <Input
              placeholder="URL (e.g. /catalog or https://…)"
              value={it.href}
              onChange={(e) => update(i, { href: e.target.value })}
              className="h-8 text-xs"
            />
            <div className="flex justify-end gap-1">
              <Button type="button" size="sm" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}>↑</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => move(i, 1)} disabled={i === value.length - 1}>↓</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => remove(i)} title="Remove">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FooterColumnsEditor({
  value,
  onChange,
}: {
  value: FooterColumn[];
  onChange: (next: FooterColumn[]) => void;
}) {
  const update = (i: number, patch: Partial<FooterColumn>) => {
    onChange(value.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  };
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = value.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const add = () =>
    onChange([...value, { titleId: "", titleEn: "", items: [] }]);
  return (
    <div className="space-y-2 rounded-md border border-dashed border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Footer columns</Label>
        <Button type="button" size="sm" variant="outline" onClick={add}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add column
        </Button>
      </div>
      {value.length === 0 && (
        <p className="text-xs text-muted-foreground">No columns yet.</p>
      )}
      <ul className="space-y-3">
        {value.map((c, i) => (
          <li key={i} className="space-y-2 rounded border border-border bg-card p-2">
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Title (ID)"
                value={c.titleId}
                onChange={(e) => update(i, { titleId: e.target.value })}
                className="h-8 text-xs"
              />
              <Input
                placeholder="Title (EN)"
                value={c.titleEn}
                onChange={(e) => update(i, { titleEn: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
            <NavLinkListEditor
              label="Links"
              value={c.items ?? []}
              onChange={(items) => update(i, { items })}
            />
            <div className="flex justify-end gap-1">
              <Button type="button" size="sm" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}>↑</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => move(i, 1)} disabled={i === value.length - 1}>↓</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => remove(i)} title="Remove column">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}