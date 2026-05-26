import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { X } from "lucide-react";
import { setLanguage, type Lang } from "@/i18n";
import { translatePath } from "./LanguageSwitcher";

const PREF = "preferred_language";
const DISMISS = "lang_banner_dismissed";
const MAX_AGE = 60 * 60 * 24 * 365;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}
function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${value}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}

export function LangSuggestionBanner() {
  const router = useRouter();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (readCookie(DISMISS) || readCookie(PREF)) return;
    const nav = window.navigator.language?.toLowerCase() ?? "";
    const onIdPath =
      window.location.pathname === "/id" ||
      window.location.pathname.startsWith("/id/");
    if (nav.startsWith("id") && onIdPath) setShow(true);
  }, []);

  if (!show) return null;

  const dismiss = (choice: Lang) => {
    writeCookie(DISMISS, "1");
    writeCookie(PREF, choice);
    setShow(false);
  };

  const switchTo = async (next: Lang) => {
    dismiss(next);
    const target = translatePath(
      typeof window !== "undefined" ? window.location.pathname : "/",
      next,
    );
    await setLanguage(next);
    router.navigate({ to: target });
  };

  return (
    <div className="border-b border-border bg-muted/60 text-foreground">
      <div className="mx-auto flex max-w-[1280px] flex-col items-start gap-2 px-4 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between md:px-8">
        <p className="leading-relaxed text-foreground/80">
          Anda di versi Bahasa Indonesia.{" "}
          <span className="font-semibold text-foreground">Switch to English?</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => switchTo("en")}
            className="rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90"
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => dismiss("id")}
            className="rounded-full border border-border px-3 py-1 text-[11px] font-medium text-foreground/80 transition hover:bg-background"
          >
            No, stay in Bahasa Indonesia
          </button>
          <button
            type="button"
            onClick={() => dismiss("id")}
            aria-label="Dismiss"
            className="ml-1 text-foreground/50 transition hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}