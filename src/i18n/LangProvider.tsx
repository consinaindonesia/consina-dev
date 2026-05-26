import { createContext, useContext, useMemo, type ReactNode } from "react";
import i18n, { type Lang } from "@/i18n";
import { localizedPath, type PageKey } from "@/i18n/routes";

type Ctx = { lang: Lang };
const LangContext = createContext<Ctx>({ lang: "id" });

export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  // Keep i18next in sync with the URL language. Safe to call during render —
  // i18next setLanguage is synchronous and idempotent.
  if (i18n.language?.split("-")[0] !== lang) {
    void i18n.changeLanguage(lang);
  }
  // Persist preference so unprefixed visits remember the choice.
  if (typeof document !== "undefined") {
    document.cookie = `lang=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  }
  const value = useMemo(() => ({ lang }), [lang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LangContext).lang;
}

export function useLocalizedPath() {
  const lang = useLang();
  return (key: PageKey, params?: { slug?: string }) => localizedPath(key, lang, params);
}
