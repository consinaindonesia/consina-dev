import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { googleFontHref, mergeTheme, type ThemeSettings } from "@/lib/theme-defaults";

export type ThemeHeadPayload = {
  theme: ThemeSettings;
  fontHref: string;
  fontPreloads: string[];
};

const FONT_CSS_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

let cachedFontPreloads: { href: string; urls: string[]; expiresAt: number } | null = null;

async function resolveFontPreloads(fontHref: string): Promise<string[]> {
  if (!fontHref) return [];
  const now = Date.now();
  if (cachedFontPreloads?.href === fontHref && cachedFontPreloads.expiresAt > now) {
    return cachedFontPreloads.urls;
  }
  const response = await fetch(fontHref, { headers: { "user-agent": FONT_CSS_USER_AGENT } });
  if (!response.ok) return [];
  const css = await response.text();
  const urls = Array.from(css.matchAll(/\/\* latin \*\/\s*@font-face\s*\{[^}]*url\((https:[^)]+\.woff2)\)/g))
    .map((match) => match[1])
    .filter((url, index, all) => all.indexOf(url) === index)
    .slice(0, 2);
  cachedFontPreloads = { href: fontHref, urls, expiresAt: now + 1000 * 60 * 60 * 24 };
  return urls;
}

export const loadThemeSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<ThemeHeadPayload> => {
    try {
      const { data } = await supabaseAdmin
        .from("theme_settings")
        .select("settings")
        .eq("id", "global")
        .maybeSingle();
      const theme = mergeTheme(data?.settings);
      const fontHref = googleFontHref(theme);
      const fontPreloads = await resolveFontPreloads(fontHref);
      return { theme, fontHref, fontPreloads };
    } catch {
      const theme = mergeTheme(undefined);
      const fontHref = googleFontHref(theme);
      return { theme, fontHref, fontPreloads: [] };
    }
  },
);