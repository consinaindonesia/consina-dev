import { createFileRoute } from "@tanstack/react-router";
import { buildHead } from "@/lib/locale-head";
import type { Lang } from "@/i18n";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function languageCookies(lang: Lang) {
  return [
    `preferred_language=${lang}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`,
    `lang=${lang}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`,
  ];
}

function normalizeLang(value: string): Lang {
  return value === "en" ? "en" : "id";
}

export const Route = createFileRoute("/$lang/")({
  head: ({ params }) => buildHead("home", params.lang as Lang),
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const lang = normalizeLang(params.lang);
        const target = new URL("/", request.url);
        const headers = new Headers({ Location: target.toString() });
        for (const cookie of languageCookies(lang)) {
          headers.append("Set-Cookie", cookie);
        }
        return new Response(null, { status: 302, headers });
      },
    },
  },
  beforeLoad: ({ params }) => {
    if (typeof document !== "undefined") {
      const lang = normalizeLang(params.lang);
      for (const cookie of languageCookies(lang)) {
        document.cookie = cookie;
      }
      window.location.replace("/");
    }
  },
  component: () => null,
});
