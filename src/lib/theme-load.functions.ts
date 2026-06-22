import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { googleFontHref, mergeTheme, type ThemeSettings } from "@/lib/theme-defaults";

export type ThemeHeadPayload = {
  theme: ThemeSettings;
  fontHref: string;
  fontPreloads: string[];
};

// Google Fonts serves different woff2 URLs per OS/browser UA — fetch both so
// preload hints are valid for Windows Chrome AND Mac/iOS Chrome users.
const FONT_CSS_UA_WIN =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const FONT_CSS_UA_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const LATIN_WOFF2_RE = /\/\* latin \*\/\s*@font-face\s*\{[^}]*url\((https:[^)]+\.woff2)\)/g;

let cachedFontPreloads: { href: string; urls: string[]; expiresAt: number } | null = null;

async function resolveFontPreloads(fontHref: string): Promise<string[]> {
  if (!fontHref) return [];
  const now = Date.now();
  if (cachedFontPreloads?.href === fontHref && cachedFontPreloads.expiresAt > now) {
    return cachedFontPreloads.urls;
  }
  const [winRes, macRes] = await Promise.all([
    fetch(fontHref, { headers: { "user-agent": FONT_CSS_UA_WIN } }),
    fetch(fontHref, { headers: { "user-agent": FONT_CSS_UA_MAC } }),
  ]);
  const extract = (css: string) =>
    Array.from(css.matchAll(LATIN_WOFF2_RE))
      .map((m) => m[1])
      .filter((u, i, arr) => arr.indexOf(u) === i);
  const winCss = winRes.ok ? await winRes.text() : "";
  const macCss = macRes.ok ? await macRes.text() : "";
  const urls = [...new Set([...extract(winCss), ...extract(macCss)])].slice(0, 4);
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
      let fontPreloads: string[] = [];
      try {
        fontPreloads = await resolveFontPreloads(fontHref);
      } catch {
        fontPreloads = [];
      }
      return { theme, fontHref, fontPreloads };
    } catch {
      const theme = mergeTheme(undefined);
      const fontHref = googleFontHref(theme);
      return { theme, fontHref, fontPreloads: [] };
    }
  },
);