import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_THEME, googleFontHref, mergeTheme, themeToCss, type ThemeSettings } from "@/lib/theme-defaults";

/**
 * Injects the global theme (CSS variables + Google font link) for the
 * storefront. Falls back to defaults — never blanks the page on error.
 * Skipped under /admin so the admin chrome keeps its fixed look.
 */
export function ThemeStyle() {
  const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_THEME);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("theme_settings")
        .select("settings")
        .eq("id", "global")
        .maybeSingle();
      if (cancelled || !data) return;
      setTheme(mergeTheme(data.settings));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fontHref = googleFontHref(theme);

  return (
    <>
      {fontHref && <link rel="stylesheet" href={fontHref} />}
      <style dangerouslySetInnerHTML={{ __html: themeToCss(theme) }} />
    </>
  );
}