# Make every section fully editable + add text-alignment control

## Goal
1. Add a left / center / right alignment control on multi-line text (description/body) for every section that has one.
2. Eliminate the hardcoded leaks found in the audit so the Design editor controls every visible element — labels, hrefs, lists, alts — across Hero, BrandStory, Categories, Featured, Community, Stores, FAQ, Contact, Newsletter, Header (Nav), Footer, and Custom. Seed every new field with current values so the storefront looks identical until edited.

## 1. Text alignment control (shared)

- Add `bodyAlign?: "left" | "center" | "right"` to `SectionStyle` in `src/lib/section-registry.ts` (so it lives on every section automatically).
- In `StyleEditor` (`src/components/admin/SectionSettingsEditor.tsx`) add a 3-way toggle (L/C/R) shown only when the section type has a body/description field.
- In `src/routes/index.tsx`, add a helper `ta(style)` that returns `{ textAlign }` and apply it to the description `<p>` (and paragraph wrappers) of: Hero subtitle, BrandStory body, Community body, Categories subtitle, Featured subtitle, StoreLocator subtitle, FAQ/FAQCustom subtitle, Newsletter body, ImageBanner body, Testimonials subtitle, Contact subtitle, Custom body, AnnouncementBar message.

## 2. Per-section gaps to wire up

### Hero
- Add `imageAlt?: Localized` → image alt input in HeroEditor.

### BrandStory
- Add `imageAlt?: Localized`, `expandLabel?: Localized`, `collapseLabel?: Localized` (seeded "Lebih Detail" / "Lebih Sedikit" / EN equivalents).
- Editor: image-alt + expand/collapse label inputs.

### Categories
- Add `viewAllCta?: CTAConfig` (seeded label "Lihat semua" / "View all", href `/catalog`).
- Extend `categoryImages[slug]` entry with optional `descriptionId/descriptionEn` so per-card description is editable. Editor already lists categories — add a Localized description field per card.

### FeaturedProducts
- Add `viewAllCta?: CTAConfig` (optional, no default href so nothing renders unless set).

### Community
- Add `imageAlt?: Localized`.

### StoreLocator
- Keep existing list editor. No new fields needed (already covered).

### FAQ / FAQ-custom
- Already covered; the in-file `faqs` constant is only a default — leave defaults but they're already overridable.

### Contact
- Add `subjects?: { labelId: string; labelEn: string; value: string }[]` (seeded with the 5 current i18n subject options). Editor: add/remove/reorder list. Renderer: build the `<select>` from this list.

### Newsletter
- Add `errorMessage?: Localized` (seeded "Email tidak valid" / "Invalid email").
- Editor: localized text field.

### Custom / ImageBanner / Gallery / Testimonials / Spacer / AnnouncementBar / Stats
- Already fully editor-covered. Only gain the new `bodyAlign` from step 1.

### Header (Nav) — `src/components/site/Nav.tsx` + HeaderSettings in `theme-defaults.ts`
- Add `navLinks?: { labelId: string; labelEn: string; href: string }[]` (seeded with current 3 mainLinks: Shop/Catalog → `/catalog`, Stores → `/stores`, Story → `/`).
- HeaderPanel editor: add/edit/remove/reorder list with label (ID+EN) + href.
- Renderer: if `navLinks` exists, render that list; otherwise current default.
- Localize the mobile-menu strings ("Wishlist", "Akun Saya", "Masuk / Daftar") via i18n keys (already in JSON) instead of new editor fields — these are UI chrome.

### Footer — `src/components/site/Footer.tsx` + FooterSettings
- Add `columns?: { titleId: string; titleEn: string; items: { labelId: string; labelEn: string; href: string }[] }[]` (seeded with the current Company + Support columns and their items).
- Add `legalLinks?: { labelId: string; labelEn: string; href: string }[]` (seeded with Privacy / Terms / Cookies → current targets).
- FooterPanel editor: add/edit/remove/reorder for both lists, with optional href.
- Renderer: build columns + legal row from settings; fall back to seeded defaults when fields are undefined (the "no row" case).

## 3. SEO & structured-data (out-of-scope marker)
Leaving page-level `<head>` meta + Organization JSON-LD as-is for this task — the user's brief is the Design editor's section/header/footer content. Will mention as a follow-up rather than expanding scope.

## 4. Verification
- Type-check passes.
- For each touched section, manually trace: editor change → `onChange` writes to `settings` → renderer reads the same key → `&&`-guarded so cleared fields render empty per the previous fix.

## Files to edit
- `src/lib/section-registry.ts` (new fields on Style, Hero, BrandStory, Categories, Featured, Community, Contact, Newsletter; defaults updated)
- `src/lib/theme-defaults.ts` (HeaderSettings.navLinks, FooterSettings.columns + legalLinks defaults)
- `src/components/admin/SectionSettingsEditor.tsx` (new inputs across editors + shared bodyAlign toggle in StyleEditor)
- `src/routes/admin/design.tsx` (HeaderPanel navLinks list, FooterPanel columns + legal list)
- `src/routes/index.tsx` (apply alignment helper, render new fields, alt texts, Contact subjects, view-all CTAs)
- `src/components/site/Nav.tsx` (use HeaderSettings.navLinks when present)
- `src/components/site/Footer.tsx` (use FooterSettings.columns + legalLinks when present)

## Out of scope (explicitly preserved)
Section engine architecture, SSR data path, page-level SEO head, Organization JSON-LD, theme system, products, checkout, accounts.

## Question for you
Two small judgement calls — defaults if you don't reply:
1. **Footer column link defaults**: the current links all point to `/`. Keep that as the seeded default (so existing visuals remain identical and you fill them in)? **Default: yes.**
2. **Nav "Story" link** currently points to `/` (no story page). Keep `/` as the seeded default for that nav item? **Default: yes.**
