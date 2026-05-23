import { useTranslation } from "react-i18next";
import { setLanguage, type Lang } from "@/i18n";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { i18n } = useTranslation();
  const current = (i18n.language?.startsWith("en") ? "en" : "id") as Lang;

  const toggle = async (next: Lang) => {
    if (next === current) return;
    await setLanguage(next);
  };

  const base =
    "px-2 py-1 text-[11px] font-semibold uppercase tracking-wider transition rounded-sm";
  const active = "bg-primary text-primary-foreground";
  const idle = "text-foreground/60 hover:text-primary";

  return (
    <div className={`inline-flex items-center gap-0.5 rounded-md border border-border bg-background/50 p-0.5 ${className}`}>
      <button
        type="button"
        onClick={() => toggle("id")}
        className={`${base} ${current === "id" ? active : idle}`}
        aria-pressed={current === "id"}
        aria-label="Bahasa Indonesia"
      >
        ID
      </button>
      <button
        type="button"
        onClick={() => toggle("en")}
        className={`${base} ${current === "en" ? active : idle}`}
        aria-pressed={current === "en"}
        aria-label="English"
      >
        EN
      </button>
    </div>
  );
}