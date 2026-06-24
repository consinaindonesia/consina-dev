import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Menu, X, Search, MapPin, ChevronDown, Heart, User, MessageCircleMore } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { LangSuggestionBanner } from "./LangSuggestionBanner";
import { AnnouncementBar } from "./AnnouncementBar";
import { CartDrawer } from "./CartDrawer";
import { SearchAdvisorDialog } from "./SearchAdvisorDialog";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { useWishlist } from "@/lib/wishlist-store";
import { usePublicCategories, type PublicCategory } from "@/hooks/use-public-categories";
import { useLang } from "@/i18n/LangProvider";
import { localizedField } from "@/i18n/format";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { isValidColor } from "@/lib/theme-defaults";

export function Nav() {
  const { t } = useTranslation();
  const lang = useLang();
  const [open, setOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [mobileCatalogOpen, setMobileCatalogOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [desktopExpandedIds, setDesktopExpandedIds] = useState<string[]>([]);
  const [mobileExpandedIds, setMobileExpandedIds] = useState<string[]>([]);
  const { data: categories, isLoading: catsLoading } = usePublicCategories();
  const { user } = useCustomerAuth();
  const { count: wishCount } = useWishlist(user?.id ?? null);
  const site = useSiteSettings();
  const header = site.header;
  const headerBgColor = isValidColor(header.bgColor) ? header.bgColor : "var(--background)";
  const linkStyle = isValidColor(header.linkColor) ? { color: header.linkColor } : undefined;
  // Always use a solid surface color for overlay dropdowns so they remain
  // readable regardless of the header's own background (which the user may
  // have set to a translucent or image-backed value).
  const dropdownStyle: React.CSSProperties = {
    backgroundColor: "var(--background)",
  };

  // Auto-hide on scroll-down, reveal on scroll-up. Always shown near top.
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  useEffect(() => {
    lastY.current = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const y = window.scrollY;
        const dy = y - lastY.current;
        if (y < 80) setHidden(false);
        else if (dy > 6) setHidden(true);
        else if (dy < -6) setHidden(false);
        lastY.current = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Keep header visible while a menu is open.
  const isHidden = hidden && !open && !mobileCatalogOpen;

  const catLabel = (c: PublicCategory) => localizedField(c, "name", lang).value;

  const toggleExpanded = (
    id: string,
    setState: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    setState((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]));
  };

  const renderDesktopCategoryTree = (nodes: PublicCategory[], depth = 0) => (
    <div className={depth > 0 ? "mt-1 border-l border-border/70 pl-3" : "space-y-1"}>
      {nodes.map((node) => {
        const isExpanded = desktopExpandedIds.includes(node.id);
        const hasChildren = node.children.length > 0;
        return (
          <div key={node.id} className="space-y-1">
            <div className="flex items-center gap-2">
              <Link
                to={"/c/$slug" as never}
                params={{ slug: node.slug } as never}
                className={`min-w-0 flex-1 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted hover:text-primary ${
                  depth === 0 ? "text-sm font-semibold text-foreground" : "text-sm text-foreground/80"
                }`}
              >
                {catLabel(node)}
              </Link>
              {hasChildren ? (
                <button
                  type="button"
                  aria-label={`Toggle ${catLabel(node)}`}
                  aria-expanded={isExpanded}
                  onClick={() => toggleExpanded(node.id, setDesktopExpandedIds)}
                  className="rounded-md p-2 text-foreground/60 transition-colors hover:bg-muted hover:text-primary"
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </button>
              ) : null}
            </div>
            {hasChildren && isExpanded ? renderDesktopCategoryTree(node.children, depth + 1) : null}
          </div>
        );
      })}
    </div>
  );

  const renderMobileCategoryTree = (nodes: PublicCategory[], depth = 0) => (
    <div className={depth > 0 ? "ml-3 border-l border-border/70 pl-3" : "space-y-1"}>
      {nodes.map((node) => {
        const isExpanded = mobileExpandedIds.includes(node.id);
        const hasChildren = node.children.length > 0;
        return (
          <div key={node.id} className="space-y-1">
            <div className="flex items-center gap-2">
              <Link
                to={"/c/$slug" as never}
                params={{ slug: node.slug } as never}
                onClick={() => setOpen(false)}
                className={`min-w-0 flex-1 rounded-md px-3 py-2 transition-colors hover:bg-muted hover:text-primary ${
                  depth === 0 ? "text-sm font-semibold text-foreground" : "text-sm text-foreground/80"
                }`}
              >
                {catLabel(node)}
              </Link>
              {hasChildren ? (
                <button
                  type="button"
                  aria-label={`Toggle ${catLabel(node)}`}
                  aria-expanded={isExpanded}
                  onClick={() => toggleExpanded(node.id, setMobileExpandedIds)}
                  className="rounded-md p-2 text-foreground/60 transition-colors hover:bg-muted hover:text-primary"
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </button>
              ) : null}
            </div>
            {hasChildren && isExpanded ? renderMobileCategoryTree(node.children, depth + 1) : null}
          </div>
        );
      })}
    </div>
  );

  const mainLinks = (header.navLinks && header.navLinks.length > 0
    ? header.navLinks.map((l, i) => ({
        key: `${l.href}-${i}`,
        to: l.href || "/",
        label: (lang === "en" ? l.labelEn : l.labelId) || l.labelEn || l.labelId || "",
      }))
    : [
        { key: "catalog", to: "/catalog", label: t("nav.catalog") },
        { key: "stores", to: "/stores", label: t("nav.stores") },
        { key: "story", to: "/", label: t("nav.story") },
      ]
  )
    .filter((l) => l.label)
    .filter((l) => l.to !== "/catalog");

  const searchBarButton = (
    <button
      type="button"
      onClick={() => setSearchOpen(true)}
      data-search-trigger="true"
      className="flex h-11 items-center gap-3 rounded-full border border-border bg-background/90 px-4 text-left text-sm text-muted-foreground shadow-sm transition hover:border-primary/30 hover:text-foreground"
      aria-label={t("nav.search")}
    >
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="truncate">{t("nav.search_placeholder", { defaultValue: "Cari produk..." })}</span>
    </button>
  );

  return (
    <header
      className={`relative sticky top-0 z-50 border-b border-border/60 transition-transform duration-300 ease-out ${
        isHidden ? "-translate-y-full" : "translate-y-0"
      }`}
      style={{ backgroundColor: headerBgColor }}
    >
      <AnnouncementBar />
      <LangSuggestionBanner />
      <div className="mx-auto hidden max-w-[1280px] items-center justify-between gap-6 px-4 py-3 md:px-8 lg:flex">
        <Link to="/" className="flex items-center gap-2">
          {header.logoUrl ? (
            <img
              src={header.logoUrl}
              alt={header.logoText || "CONSINA"}
              className="h-9 w-auto object-contain xl:h-10"
            />
          ) : (
            <span className="text-2xl font-black tracking-tight text-primary">
              {header.logoText || "CONSINA"}
            </span>
          )}
          {header.showSinceTag && (
            <span className="hidden text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground xl:inline">
              {t("nav.since")}
            </span>
          )}
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {/* Catalog dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setCatalogOpen(true)}
            onMouseLeave={() => setCatalogOpen(false)}
          >
            <button
              className="flex items-center gap-1 text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
              aria-expanded={catalogOpen}
              aria-haspopup="true"
              style={linkStyle}
            >
              {t("nav.catalog")}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${catalogOpen ? "rotate-180" : ""}`} />
            </button>
            {catalogOpen && (
              <div
                className="absolute -left-4 top-full mt-2 w-[360px] rounded-2xl border border-border p-2 shadow-xl"
                style={dropdownStyle}
              >
                {catsLoading ? (
                  <div className="space-y-2 px-4 py-2">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="h-4 w-32 animate-pulse rounded bg-muted" />
                    ))}
                  </div>
                ) : !categories || categories.length === 0 ? (
                  <div className="px-4 py-2 text-sm text-muted-foreground">
                    {t("nav.no_categories", { defaultValue: "No categories" })}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Link
                      to="/catalog"
                      className="block rounded-xl px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-muted"
                    >
                      {t("nav.catalog")}
                    </Link>
                    <div className="max-h-[70vh] overflow-y-auto pr-1">
                      {renderDesktopCategoryTree(categories)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {mainLinks.map((l) => (
            <Link
              key={l.key}
              to={l.to as never}
              className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
              style={linkStyle}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {header.showSearch && (
            <div className="mr-1 hidden lg:block">
              <div className="w-[220px] xl:w-[280px]">
                {searchBarButton}
              </div>
            </div>
          )}
          <CartDrawer />
          {header.showWishlist && <Link
            to="/wishlist"
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 transition hover:bg-muted hover:text-primary"
            aria-label="Wishlist"
          >
            <Heart className="h-4 w-4" />
            {wishCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {wishCount}
              </span>
            )}
          </Link>}
          {header.showAccount && <Link
            to={user ? "/akun" : "/auth"}
            className="hidden h-9 w-9 items-center justify-center rounded-full text-foreground/70 transition hover:bg-muted hover:text-primary md:flex"
            aria-label={user ? "Akun saya" : "Masuk"}
          >
            <User className="h-4 w-4" />
          </Link>}
          <LanguageSwitcher className="hidden md:inline-flex" menuBg={headerBgColor} />
          {header.showFindStore && <Link
            to="/stores"
            className="hidden items-center gap-1.5 rounded-full border border-primary/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary transition hover:bg-primary hover:text-primary-foreground md:inline-flex"
          >
            <MapPin className="h-3.5 w-3.5" />
            {t("nav.find_store")}
          </Link>}
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-4 py-3 md:px-8 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="min-w-0 flex items-center gap-2">
            {header.logoUrl ? (
              <img
                src={header.logoUrl}
                alt={header.logoText || "CONSINA"}
                className="h-7 w-auto max-w-[210px] object-contain sm:h-8"
              />
            ) : (
              <span className="text-xl font-black tracking-tight text-primary">
                {header.logoText || "CONSINA"}
              </span>
            )}
          </Link>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <CartDrawer />
            {header.showWishlist && (
              <Link
                to="/wishlist"
                className="relative flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 transition hover:bg-muted hover:text-primary"
                aria-label="Wishlist"
              >
                <Heart className="h-4 w-4" />
                {wishCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {wishCount}
                  </span>
                )}
              </Link>
            )}
            <LanguageSwitcher className="inline-flex" menuBg={headerBgColor} />
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full text-foreground"
              onClick={() => setOpen(!open)}
              aria-label={t("nav.menu")}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-border bg-background lg:hidden">
          <nav className="mx-auto flex max-w-[1280px] flex-col gap-1 px-4 py-4">
            {header.showSearch && (
              <div className="mb-2">
                <div className="w-full">
                  {searchBarButton}
                </div>
              </div>
            )}
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              {t("nav.home")}
            </Link>

            {/* Mobile catalog accordion */}
            <button
              onClick={() => setMobileCatalogOpen(!mobileCatalogOpen)}
              className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              <span>{t("nav.catalog")}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${mobileCatalogOpen ? "rotate-180" : ""}`} />
            </button>
            {mobileCatalogOpen && (
              <div className="ml-4 max-h-[60vh] overflow-y-auto border-l border-border pl-3">
                <Link
                  to="/catalog"
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-3 py-2 text-sm font-semibold text-primary hover:bg-muted"
                >
                  {t("nav.catalog")}
                </Link>
                {(categories ?? []).length > 0 && renderMobileCategoryTree(categories)}
              </div>
            )}

            {mainLinks.map((l) => (
              <Link
                key={l.key}
                to={l.to as never}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                {l.label}
              </Link>
            ))}
            <Link to="/wishlist" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
              Wishlist{wishCount > 0 ? ` (${wishCount})` : ""}
            </Link>
            <Link to={user ? "/akun" : "/auth"} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
              {user ? "Akun Saya" : "Masuk / Daftar"}
            </Link>
            <div className="mt-2 px-3">
              <LanguageSwitcher />
            </div>
          </nav>
        </div>
      )}
      <button
        type="button"
        onClick={() => setChatOpen(true)}
        data-chat-trigger="true"
        aria-label={lang === "id" ? "Buka chatbot Consina" : "Open Consina chatbot"}
        className="fixed bottom-5 right-5 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_16px_40px_rgba(13,61,41,0.28)] transition hover:scale-105 hover:bg-primary/92"
      >
        <MessageCircleMore className="h-6 w-6" />
      </button>
      <SearchAdvisorDialog open={searchOpen} onOpenChange={setSearchOpen} variant="dropdown" />
      <SearchAdvisorDialog open={chatOpen} onOpenChange={setChatOpen} variant="chat" />
    </header>
  );
}
