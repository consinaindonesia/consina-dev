import { useEffect, useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_THEME, mergeTheme, type ThemeSettings } from "@/lib/theme-defaults";

/**
 * Subscribes to the global theme_settings row. Returns merged defaults so
 * the storefront never renders blank if the row is missing.
 * Refreshes when the parent admin preview posts {type:"lovable-theme-refresh"}.
 */
const rootRouteApi = getRouteApi("__root__");

function useInitialThemeFromRoot(): ThemeSettings {
  try {
    const data = rootRouteApi.useLoaderData() as { theme?: ThemeSettings } | undefined;
    return data?.theme ?? DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function useSiteSettings(initialTheme?: ThemeSettings): ThemeSettings {
  const rootTheme = useInitialThemeFromRoot();
  const [theme, setTheme] = useState<ThemeSettings>(initialTheme ?? rootTheme);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("theme_settings")
        .select("settings")
        .eq("id", "global")
        .maybeSingle();
      if (cancelled) return;
      setTheme(mergeTheme(data?.settings));
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

  return theme;
}