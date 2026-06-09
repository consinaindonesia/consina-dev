import { googleFontHref, themeToCss } from "@/lib/theme-defaults";
import { useSiteSettings } from "@/hooks/use-site-settings";

/**
 * Injects the global theme (CSS variables + Google font link) for the
 * storefront. Falls back to defaults — never blanks the page on error.
 * Skipped under /admin so the admin chrome keeps its fixed look.
 */
export function ThemeStyle() {
  const theme = useSiteSettings();
  const fontHref = googleFontHref(theme);

  return (
    <>
      {fontHref && <link rel="stylesheet" href={fontHref} />}
      <style dangerouslySetInnerHTML={{ __html: themeToCss(theme) }} />
    </>
  );
}