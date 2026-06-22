import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_ANNOUNCEMENT_BAR,
  mergeSettings,
  pickLocalized,
  type AnnouncementBarSettings,
} from "@/lib/section-registry";
import { useLang } from "@/i18n/LangProvider";
import { TypewriterText } from "./TypewriterText";

type AnnouncementBarRow = {
  settings: unknown;
};

export function AnnouncementBar() {
  const lang = useLang();
  const [settings, setSettings] = useState<AnnouncementBarSettings | null>(
    DEFAULT_ANNOUNCEMENT_BAR,
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase
        .from("page_sections")
        .select("settings")
        .eq("page", "home")
        .eq("section_type", "announcement_bar")
        .eq("enabled", true)
        .order("position", { ascending: true })
        .limit(1);
      if (cancelled) return;
      if (error) {
        setSettings(DEFAULT_ANNOUNCEMENT_BAR);
        return;
      }
      const row = (data?.[0] ?? null) as AnnouncementBarRow | null;
      setSettings(row ? mergeSettings("announcement_bar", row.settings) : null);
    };

    void load();
    const onMsg = (e: MessageEvent) => {
      if (e?.data?.type === "lovable-theme-refresh") void load();
    };
    window.addEventListener("message", onMsg);
    return () => {
      cancelled = true;
      window.removeEventListener("message", onMsg);
    };
  }, []);

  if (!settings) return null;
  const msg = pickLocalized(settings.message, lang);
  if (!msg) return null;
  const linkLabel = pickLocalized(settings.linkLabel, lang);

  return (
    <div
      className="w-full px-4 py-2 text-center text-xs font-medium md:text-sm"
      style={{
        backgroundColor: settings.bgColor ?? settings.style?.bgColor ?? "#1a3a2e",
        color: settings.style?.bodyColor ?? settings.textColor ?? settings.style?.textColor ?? "#ffffff",
      }}
    >
      <TypewriterText text={msg} />
      {linkLabel && settings.href && (
        <a
          href={settings.href}
          className="ml-2 underline underline-offset-2 hover:opacity-80"
          style={settings.style?.ctaTextColor ? { color: settings.style.ctaTextColor } : undefined}
        >
          {linkLabel}
        </a>
      )}
    </div>
  );
}
