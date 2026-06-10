import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "@tanstack/react-router";
import { Check, Globe, ChevronDown } from "lucide-react";
import { setLanguage, type Lang } from "@/i18n";
import { parseLocalizedPath, localizedPath } from "@/i18n/routes";

const PREF_COOKIE = "preferred_language";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function writePrefCookie(lang: Lang) {
  if (typeof document === "undefined") return;
  document.cookie = `${PREF_COOKIE}=${lang}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

/** Compute the equivalent URL in `target` language for the current pathname. */
export function translatePath(pathname: string, target: Lang): string {
  const parsed = parseLocalizedPath(pathname);
  if (parsed) {
    return localizedPath(parsed.key, target, parsed.params);
  }
  // Unknown / legacy path — fall back to homepage in target lang.
  return `/${target}`;
}

function FlagID({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 6 4" className={className} aria-hidden="true">
      <rect width="6" height="2" fill="#e70011" />
      <rect y="2" width="6" height="2" fill="#ffffff" />
    </svg>
  );
}

function FlagEN({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 30" className={className} aria-hidden="true">
      <clipPath id="lng-uk-clip"><path d="M0,0 v30 h60 v-30 z" /></clipPath>
      <g clipPath="url(#lng-uk-clip)">
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="2" />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
}

const OPTIONS: Array<{ code: Lang; label: string; short: string; Flag: typeof FlagID }> = [
  { code: "id", label: "Bahasa Indonesia", short: "ID", Flag: FlagID },
  { code: "en", label: "English", short: "EN", Flag: FlagEN },
];

export function LanguageSwitcher({ className = "", menuBg }: { className?: string; menuBg?: string }) {
  const { i18n } = useTranslation();
  const router = useRouter();
  const current = (i18n.language?.startsWith("en") ? "en" : "id") as Lang;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = async (next: Lang) => {
    setOpen(false);
    writePrefCookie(next);
    if (next === current) return;
    const pathname =
      typeof window !== "undefined" ? window.location.pathname : "/";
    const target = translatePath(pathname, next);
    await setLanguage(next);
    router.navigate({ to: target, replace: false });
  };

  const Current = OPTIONS.find((o) => o.code === current) ?? OPTIONS[0];

  return (
    <div ref={ref} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language: ${Current.label}`}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/50 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/80 transition hover:border-primary/40 hover:text-primary"
      >
        <Globe className="h-3.5 w-3.5 opacity-70" />
        <span>{Current.short}</span>
        <ChevronDown className={`h-3 w-3 opacity-60 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-50 mt-1 min-w-[180px] overflow-hidden rounded-lg border border-border py-1 shadow-xl"
          style={{ backgroundColor: menuBg || "var(--background)" }}
        >
          {OPTIONS.map((opt) => {
            const selected = opt.code === current;
            return (
              <li key={opt.code} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => choose(opt.code)}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
                    selected ? "text-primary" : "text-foreground"
                  }`}
                >
                  <opt.Flag className="h-3 w-4 rounded-[1px] ring-1 ring-border/60" />
                  <span className="flex-1 font-medium">{opt.label}</span>
                  {selected ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <span className="h-4 w-4" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}