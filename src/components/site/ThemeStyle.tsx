import { themeToCss } from "@/lib/theme-defaults";
import { useSiteSettings } from "@/hooks/use-site-settings";
import type { ThemeSettings } from "@/lib/theme-defaults";

/**
 * Keeps storefront CSS variables live for the admin preview.
 * Font files are loaded from the SSR head to avoid first-paint swaps.
 */
export function ThemeStyle({ initialTheme }: { initialTheme: ThemeSettings }) {
  const theme = useSiteSettings(initialTheme);

  return <style dangerouslySetInnerHTML={{ __html: themeToCss(theme) }} />;
}