// Default theme tokens (mirror src/styles.css :root values for the core set
// the Design editor can override).

export type ThemeSettings = {
  colors: {
    background: string;
    foreground: string;
    primary: string;
    accent: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
};

export const DEFAULT_THEME: ThemeSettings = {
  colors: {
    background: "oklch(0.975 0.012 90)",
    foreground: "oklch(0.18 0.005 60)",
    primary: "oklch(0.30 0.045 155)",
    accent: "oklch(0.80 0.055 80)",
  },
  fonts: {
    heading: "Archivo",
    body: "Inter",
  },
};

export const FONT_OPTIONS: { value: string; label: string; googleFamily: string }[] = [
  { value: "Archivo", label: "Archivo", googleFamily: "Archivo:wght@600;700;800;900" },
  { value: "Inter", label: "Inter", googleFamily: "Inter:wght@400;500;600;700" },
  { value: "Playfair Display", label: "Playfair Display", googleFamily: "Playfair+Display:wght@600;700;800" },
  { value: "Space Grotesk", label: "Space Grotesk", googleFamily: "Space+Grotesk:wght@500;600;700" },
  { value: "DM Sans", label: "DM Sans", googleFamily: "DM+Sans:wght@400;500;700" },
  { value: "Fraunces", label: "Fraunces", googleFamily: "Fraunces:wght@500;600;700;800" },
  { value: "Manrope", label: "Manrope", googleFamily: "Manrope:wght@400;500;600;700" },
  { value: "Work Sans", label: "Work Sans", googleFamily: "Work+Sans:wght@400;500;600;700" },
];

export function googleFontHref(theme: ThemeSettings): string {
  const wanted = new Set<string>();
  for (const family of [theme.fonts.heading, theme.fonts.body]) {
    const opt = FONT_OPTIONS.find((o) => o.value === family);
    if (opt) wanted.add(opt.googleFamily);
  }
  if (wanted.size === 0) return "";
  return `https://fonts.googleapis.com/css2?${Array.from(wanted)
    .map((f) => `family=${f}`)
    .join("&")}&display=swap`;
}

// Merge any partial settings stored in DB into the defaults.
export function mergeTheme(partial: unknown): ThemeSettings {
  const p = (partial ?? {}) as Partial<ThemeSettings>;
  return {
    colors: { ...DEFAULT_THEME.colors, ...(p.colors ?? {}) },
    fonts: { ...DEFAULT_THEME.fonts, ...(p.fonts ?? {}) },
  };
}

export function themeToCss(theme: ThemeSettings): string {
  const c = theme.colors;
  return `:root{--background:${c.background};--foreground:${c.foreground};--primary:${c.primary};--ring:${c.primary};--accent:${c.accent};}
body{font-family:"${theme.fonts.body}",ui-sans-serif,system-ui,sans-serif;}
h1,h2,h3,h4{font-family:"${theme.fonts.heading}","${theme.fonts.body}",ui-sans-serif,system-ui,sans-serif;}`;
}