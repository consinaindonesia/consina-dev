import { useTranslation } from "react-i18next";
import { useRouter } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { setLanguage, type Lang } from "@/i18n";
import { translatePath } from "./LanguageSwitcher";

/**
 * Shown at the top of a content page when the current item only exists in
 * the OTHER language. Offers a one-click switch.
 */
export function MissingTranslationNotice({ otherLang }: { otherLang: Lang }) {
  const { t } = useTranslation();
  const router = useRouter();

  const onSwitch = async () => {
    const pathname =
      typeof window !== "undefined" ? window.location.pathname : "/";
    await setLanguage(otherLang);
    router.navigate({ to: translatePath(pathname, otherLang) });
  };

  const message =
    otherLang === "id"
      ? t("missing_translation.only_id", {
          defaultValue: "This product is only available in Indonesian.",
        })
      : t("missing_translation.only_en", {
          defaultValue: "This product is only available in English.",
        });
  const cta =
    otherLang === "id"
      ? t("missing_translation.switch_to_id", {
          defaultValue: "Switch to Indonesian view",
        })
      : t("missing_translation.switch_to_en", {
          defaultValue: "Switch to English view",
        });

  return (
    <div className="border-b border-amber-500/30 bg-amber-50/80 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
      <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-4 py-2.5 text-xs md:px-8">
        <AlertCircle className="h-4 w-4 shrink-0 opacity-80" />
        <p className="flex-1">{message}</p>
        <button
          type="button"
          onClick={onSwitch}
          className="rounded-full border border-current/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider transition hover:bg-amber-100/60 dark:hover:bg-amber-900/40"
        >
          {cta}
        </button>
      </div>
    </div>
  );
}