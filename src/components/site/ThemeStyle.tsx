import { themeToCss } from "@/lib/theme-defaults";
import { useSiteSettings } from "@/hooks/use-site-settings";

/**
 * Keeps storefront CSS variables live for the admin preview.
 * Font files are loaded from the SSR head to avoid first-paint swaps.
 */
export function ThemeStyle() {
  const theme = useSiteSettings();

  return <style dangerouslySetInnerHTML={{ __html: themeToCss(theme) }} />;
}