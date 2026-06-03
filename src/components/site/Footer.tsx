import { Link } from "@tanstack/react-router";
import { Instagram, Facebook, Youtube } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { usePublicCategories } from "@/hooks/use-public-categories";
import { useLang } from "@/i18n/LangProvider";
import { localizedField } from "@/i18n/format";

export function Footer() {
  const { t } = useTranslation();
  const lang = useLang();
  const { data: categories } = usePublicCategories();
  const shopLinks = (categories ?? []).map((c) => ({
    label: localizedField(c, "name", lang).value,
    slug: c.slug,
  }));
  const cols = [
    {
      title: t("footer.company"),
      items: [
        t("footer.items.our_story"),
        t("footer.items.responsible_trekker"),
        t("footer.items.sustainability"),
        t("footer.items.careers"),
        t("footer.items.press"),
      ],
    },
    {
      title: t("footer.support"),
      items: [
        t("footer.items.store_locator"),
        t("footer.items.warranty"),
        t("footer.items.care_guides"),
        t("footer.items.contact"),
        t("footer.items.faq"),
      ],
    },
  ];

  return (
    <footer className="mt-24 border-t border-border bg-primary text-primary-foreground">
      <div className="mx-auto max-w-[1280px] px-4 py-16 md:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="font-[Archivo] text-3xl font-black tracking-tight">CONSINA</div>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.25em] text-accent">
              {t("footer.tagline")}
            </p>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-primary-foreground/70">
              {t("footer.blurb")}
            </p>
            <div className="mt-6 flex gap-3">
              {[Instagram, Facebook, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-primary-foreground/20 text-primary-foreground transition hover:border-accent hover:text-accent"
                  aria-label="Social link"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              {t("footer.shop")}
            </h4>
            <ul className="mt-5 space-y-3">
              {shopLinks.map((l) => (
                <li key={l.slug}>
                  <Link
                    to={"/c/$slug" as never}
                    params={{ slug: l.slug } as never}
                    className="text-sm text-primary-foreground/75 transition hover:text-primary-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                {c.title}
              </h4>
              <ul className="mt-5 space-y-3">
                {c.items.map((i) => (
                  <li key={i}>
                    <Link to="/" className="text-sm text-primary-foreground/75 transition hover:text-primary-foreground">
                      {i}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-col gap-3 border-t border-primary-foreground/10 pt-6 text-xs text-primary-foreground/55 md:flex-row md:items-center md:justify-between">
          <span>{t("footer.copyright", { year: new Date().getFullYear() })}</span>
          <div className="flex flex-wrap items-center gap-5">
            <Link to="/">{t("footer.privacy")}</Link>
            <Link to="/">{t("footer.terms")}</Link>
            <Link to="/">{t("footer.cookies")}</Link>
            <LanguageSwitcher className="ml-auto" />
          </div>
        </div>
      </div>
    </footer>
  );
}