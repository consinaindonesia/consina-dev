# Language-Prefixed Routing

Move the entire public site under `/id/*` and `/en/*` with translated slugs, automatic redirect from unprefixed URLs, a language context, auto-prefixed internal links, and full SEO (hreflang, html lang, sitemap).

Admin (`/admin/*`) stays unprefixed and English-only.

---

## 1. Slug map

Single source of truth in `src/i18n/routes.ts`:

```
PAGES = {
  home:        { id: "",            en: ""            }, // /id, /en
  catalog:     { id: "katalog",     en: "catalog"     },
  stores:      { id: "toko",        en: "stores"      },
  contact:     { id: "kontak",      en: "contact"     },
  carriers:    { id: "kategori/carriers",   en: "categories/carriers" },
  tents:       { id: "kategori/tents",      en: "categories/tents" },
  apparel:     { id: "kategori/apparel",    en: "categories/apparel" },
  footwear:    { id: "kategori/footwear",   en: "categories/footwear" },
  accessories: { id: "kategori/accessories", en: "categories/accessories" },
  product:     { id: "produk",      en: "products"    }, // + /$slug
}
```

Helpers: `localizedPath(key, lang, params?)`, `parseLocalizedPath(pathname)` (returns `{ lang, key, params }` or null).

Note: there is no `/contact` page today. Skip it for now or add a stub — confirm during build. Default: skip, only translate routes that exist.

---

## 2. Route tree restructure

Move every public route under a pathless `_public.$lang` layout segment using TanStack's optional/dynamic param. Concrete file layout:

```
src/routes/
  __root.tsx                  (sets html lang dynamically)
  index.tsx                   (server handler: 302 → /id or /en based on Accept-Language)
  $lang.tsx                   (layout: validates lang in ["id","en"], provides LangContext, renders <Outlet/>)
  $lang.index.tsx             (home)
  $lang.katalog.tsx           ← rendered for ID; route path uses literal slug
  $lang.catalog.tsx           ← rendered for EN
  ...
  admin/...                   (unchanged, no prefix)
  sitemap[.]xml.ts            (lists both languages × all pages)
```

Problem: TanStack file routes can't have two different literal slugs map to the same `$lang` parent cleanly. **Better approach** — use splat with manual matching:

```
src/routes/
  $lang/
    index.tsx                 // /id, /en — home
    $.tsx                     // /id/* , /en/* — splat resolves to a page via parseLocalizedPath
```

The splat route reads `params._splat`, calls `parseLocalizedPath`, and renders the matching page component (imported from `src/pages/`). 404 if no match.

This keeps a single splat handler per language and avoids 14 route files per language. Page components move from `src/routes/*.tsx` to `src/pages/*.tsx` (plain React components, no `createFileRoute`). Route files become thin wrappers.

Top-level `/` becomes a server-handler-only file that 302-redirects based on `Accept-Language` header (server) or `navigator.language` (client fallback via tiny component).

---

## 3. Language context

`src/i18n/LangProvider.tsx`:
- `LangContext` exposes `{ lang: "id" | "en" }`
- `$lang.tsx` layout reads `params.lang`, validates, calls `i18n.changeLanguage(lang)` in an effect, writes cookie, renders provider + `<Outlet/>`
- `useLang()` hook for components
- `useLocalizedPath(key, params?)` returns the correctly-prefixed href for the current lang

---

## 4. Internal links

Add `<LocaleLink to="catalog" />` wrapper around TanStack `<Link>`:
- Accepts a page key from PAGES (not a raw path)
- Resolves to `/{lang}/{slug}` using current lang
- All existing `<Link to="/catalog">` etc. in `Nav.tsx`, `Footer.tsx`, route bodies migrate to `<LocaleLink to="catalog" />`

LanguageSwitcher: instead of cookie + reload, navigate to the equivalent localized path in the other language (use `parseLocalizedPath` to find the current page key, then `localizedPath(key, otherLang)`).

---

## 5. Root + SEO

`__root.tsx`:
- `RootShell` reads lang from route match (via `useRouterState`) and sets `<html lang={lang}>`; defaults to `id` on `/` before redirect
- Adds `<link rel="alternate" hreflang="id" href=".../id/{slug}">` and same for `en` and `x-default` via per-route `head()` — implemented as a helper `localeHead(key, params?)` called from each page's `head()`

Each page component exports a `head` builder used by the splat route (since the splat owns `createFileRoute`, it builds head per resolved page).

---

## 6. Sitemap

`sitemap[.]xml.ts` iterates `PAGES × ["id","en"]` and emits both URLs with `<xhtml:link rel="alternate" hreflang>` entries per Google guidelines. Adds product entries from `src/data/products.ts` for both langs.

---

## 7. Admin

Untouched. Still at `/admin/*`. Admin UI stays English. Confirm `LangProvider` isn't required there (admin routes don't render `$lang` layout).

---

## Technical details

- **Splat-based routing trade-off:** loses TanStack's per-file `head()` and type-safe `<Link to>` autocomplete for public pages. Mitigated by `LocaleLink` (type-safe over PAGES keys) and `localeHead()` helper.
- **i18n init:** `src/i18n/index.ts` no longer detects from URL on boot; `$lang` layout drives `changeLanguage`. Initial lang on `/` before redirect = `id` (default).
- **Server redirect at `/`:** `src/routes/index.tsx` uses `server.handlers.GET` reading `Accept-Language` header, returns 302 to `/id` or `/en`. Client fallback (for SPA navigation) does the same via a tiny component using `navigator.language`.
- **Legacy URLs:** old `/catalog`, `/stores`, etc. — add a top-level splat `$.tsx` at root that 302s to the localized equivalent (best-effort: try matching the path against both lang slug tables, fall back to `/id`).
- **Delete** `src/routes/en/index.tsx`, `src/routes/en/$.tsx` (replaced by new system).

---

## Files created
- `src/i18n/routes.ts`
- `src/i18n/LangProvider.tsx`
- `src/components/site/LocaleLink.tsx`
- `src/pages/{Home,Catalog,Stores,Carriers,Tents,Apparel,Footwear,Accessories}.tsx` (moved from `src/routes/`)
- `src/routes/$lang/index.tsx`
- `src/routes/$lang/$.tsx`
- `src/routes/$.tsx` (legacy redirect)

## Files edited
- `src/routes/__root.tsx`, `src/routes/index.tsx`
- `src/components/site/Nav.tsx`, `src/components/site/Footer.tsx`, `src/components/site/LanguageSwitcher.tsx`
- `src/routes/sitemap[.]xml.ts`
- `src/i18n/index.ts`

## Files deleted
- `src/routes/{catalog,stores,carriers,tents,apparel,footwear,accessories}.tsx` (replaced by `src/pages/*` + splat)
- `src/routes/en/index.tsx`, `src/routes/en/$.tsx`

---

## Open questions

1. **Contact page** doesn't exist — skip the `/kontak` ↔ `/contact` slug pair, or add a stub page?
2. **Product detail route** — `src/routes/c.$slug.tsx` exists (category by slug). Confirm: should it also move under `/id/produk/$slug` and `/en/products/$slug`, and is `c.$slug` the product page or something else? I'll inspect before editing.
3. **Old unprefixed URLs in the wild** (already shared/indexed): keep 302 redirects forever (recommended) or hard-remove?
