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
  DEFAULT_SECTION_SETTINGS,
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
  type ThemeSettings,
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
      setSections(secs as PageSectionRow[]);
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Design</h1>
          <p className="text-sm text-muted-foreground">
            Compose the homepage from modular sections and tune the global theme.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary hover:bg-muted"
          >
            <ExternalLink className="h-3.5 w-3.5" /> View storefront
          </a>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left: sections list */}
        <div className="space-y-4 rounded-lg border border-border bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Homepage sections
            </h2>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={resetSections}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset to default
              </Button>
              <div className="relative">
                <Button size="sm" onClick={() => setAddOpen((o) => !o)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add section
                </Button>
                {addOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setAddOpen(false)} />
                    <div className="absolute right-0 z-40 mt-1 w-64 overflow-hidden rounded-md border border-border bg-white shadow-lg">
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
                else toast.success("Section saved");
              }}
            />
          )}
        </div>

        {/* Right: theme */}
        <ThemePanel
          theme={theme}
          saving={savingTheme}
          onChange={(t) => void saveTheme(t)}
          onReset={() => void resetTheme()}
        />
      </div>
    </div>
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
}: {
  row: PageSectionRow;
  onChange: (next: Record<string, unknown>) => void;
  onSave: (next: Record<string, unknown>) => Promise<void>;
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
        <Button size="sm" onClick={() => void onSave(merged)}>
          Save
        </Button>
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
        {(["background", "foreground", "primary", "accent"] as const).map((k) => (
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
        />
        <FontRow
          label="Body"
          value={theme.fonts.body}
          onChange={(v) => set("fonts", "body", v)}
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <span className="mb-1 block text-xs font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
      >
        {FONT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="mt-1 block text-xs text-muted-foreground" style={{ fontFamily: value }}>
        The quick brown fox jumps over the lazy dog.
      </span>
    </div>
  );
}

// Switch is imported for future per-section settings; keep tree-shake friendly
void Switch;