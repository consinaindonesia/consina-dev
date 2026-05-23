import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/locales/en/common.json";
import id from "@/locales/id/common.json";

export const SUPPORTED_LANGS = ["id", "en"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];
export const DEFAULT_LANG: Lang = "id";

const COOKIE_NAME = "lang";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

export function writeLangCookie(lang: Lang) {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=${lang}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function detectInitialLang(): Lang {
  if (typeof window === "undefined") return DEFAULT_LANG;
  // 1. URL prefix /en
  const path = window.location.pathname;
  if (path === "/en" || path.startsWith("/en/")) return "en";
  // 2. Cookie
  const cookieLang = readCookie(COOKIE_NAME);
  if (cookieLang === "en" || cookieLang === "id") return cookieLang;
  // 3. Browser
  const nav = window.navigator.language?.toLowerCase() ?? "";
  if (nav.startsWith("en")) return "en";
  return DEFAULT_LANG;
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { common: en },
      id: { common: id },
    },
    lng: detectInitialLang(),
    fallbackLng: DEFAULT_LANG,
    defaultNS: "common",
    ns: ["common"],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export async function setLanguage(lang: Lang) {
  writeLangCookie(lang);
  await i18n.changeLanguage(lang);
}

export function getActiveLang(language: string | undefined): Lang {
  return language?.startsWith("en") ? "en" : "id";
}

export default i18n;