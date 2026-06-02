import { useEffect, useState } from "react";

const STORAGE_KEY = "cookie_consent";
const MAX_AGE_DAYS = 365; // 12 months

type Consent = "accepted" | "rejected";

function readConsent(): Consent | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )cookie_consent=([^;]*)/);
  if (!m) return null;
  const v = decodeURIComponent(m[1]);
  return v === "accepted" || v === "rejected" ? v : null;
}

function writeConsent(v: Consent) {
  const maxAge = MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${STORAGE_KEY}=${v}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  // Detect language from URL prefix for copy
  const [isEn, setIsEn] = useState(false);

  useEffect(() => {
    if (readConsent()) return;
    setVisible(true);
    const path = window.location.pathname;
    setIsEn(path === "/en" || path.startsWith("/en/"));
  }, []);

  if (!visible) return null;

  const t = isEn
    ? {
        message: "We use essential cookies to run this site. With your consent, we may also use analytics cookies to improve it.",
        accept: "Accept",
        reject: "Reject",
        learn: "Privacy policy",
        learnHref: "/en/privacy",
      }
    : {
        message: "Kami menggunakan cookie esensial agar situs ini berjalan. Dengan persetujuan Anda, kami juga dapat menggunakan cookie analitik untuk meningkatkannya.",
        accept: "Terima",
        reject: "Tolak",
        learn: "Kebijakan privasi",
        learnHref: "/id/privacy",
      };

  function choose(v: Consent) {
    writeConsent(v);
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-3xl rounded-lg border border-border bg-white p-4 shadow-lg sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-foreground">
          {t.message}{" "}
          <a href={t.learnHref} className="underline">{t.learn}</a>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => choose("rejected")}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent"
          >
            {t.reject}
          </button>
          <button
            onClick={() => choose("accepted")}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t.accept}
          </button>
        </div>
      </div>
    </div>
  );
}

export function hasCookieConsent(): boolean {
  return readConsent() === "accepted";
}