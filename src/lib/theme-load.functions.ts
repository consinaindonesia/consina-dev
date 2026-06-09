import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { mergeTheme, type ThemeSettings } from "@/lib/theme-defaults";

export const loadThemeSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<ThemeSettings> => {
    try {
      const { data } = await supabaseAdmin
        .from("theme_settings")
        .select("settings")
        .eq("id", "global")
        .maybeSingle();
      return mergeTheme(data?.settings);
    } catch {
      return mergeTheme(undefined);
    }
  },
);