# Consina

Indonesian outdoor gear e-commerce — built with TanStack Start, React, Supabase, and Tailwind.

## Stack

- **Framework:** TanStack Start (SSR) + TanStack Router
- **UI:** React 19, Tailwind CSS v4, Radix UI
- **Data:** Supabase (auth + database)
- **Payments:** Midtrans, Stripe
- **Shipping:** Biteship
- **i18n:** i18next (ID / EN)

## Development

```bash
npm install
npm run dev
```

The app is developed and previewed on [Lovable](https://lovable.dev). The `vercel.json` and `api/server.mjs` files are Vercel-only deployment infrastructure and have no effect on the Lovable or local dev experience.

### Supabase project sanity check

This repo is wired to Supabase project `dbgxaffgujugnqyoyuic`.

Before running migrations, deploying, or debugging database-backed features from a new environment, verify the local env matches `supabase/config.toml`:

```bash
npm run check:supabase
```

If this check fails, stop before deploying and make sure `.env`, Lovable secrets, Vercel environment variables, and `supabase/config.toml` all point to `dbgxaffgujugnqyoyuic`.

## Deployment (Vercel)

The app uses TanStack Start's SSR pipeline, not a plain SPA build. The Vercel configuration reflects this:

| Setting | Value | Why |
|---|---|---|
| `outputDirectory` | `dist/client` | Aset statis disajikan dari hasil build client |
| `functions.includeFiles` | `dist/server/**` | Bundle SSR disertakan ke dalam Lambda |
| `rewrites` | `/(.*) → /api/server` | Semua request non-statis diarahkan ke SSR handler |

`api/server.mjs` adalah entry point serverless Vercel. File ini mengimpor `dist/server/server.js` (bundle SSR TanStack Start) dan mendelegasikan semua request ke sana. File statis di `dist/client/` disajikan langsung dari CDN sebelum rewrite diterapkan.

## Catatan Perubahan

### Perbaikan Deployment Vercel (2026-06-07)

**`vercel.json`**
- Hapus field `framework: "other"` — nilai tersebut tidak valid di schema Vercel. Menghapus field ini menghasilkan efek yang sama: tidak ada preset yang diterapkan.

**`api/server.mjs` — tiga perbaikan berurutan**

1. **Path import salah** — `dist/server/index.js` diubah menjadi `dist/server/server.js` agar sesuai dengan output build yang sebenarnya.

2. **`ERR_INVALID_URL`** — Vercel mengirim request dengan URL relatif (`/`). Library `srvx` (digunakan oleh h3-v2/TanStack Start) memanggil `new URL('/')` yang tidak valid karena membutuhkan URL absolut. Solusi: rekonstruksi URL menggunakan header `host`.

3. **`req.headers.get is not a function`** — Runtime Node.js Vercel mengirim `headers` sebagai plain object (`IncomingMessage`), bukan instance `Headers`. Solusi: normalisasi ke `new Headers()` sebelum memanggilnya.

4. **Handler signature salah** — `export default function(req)` mengembalikan `Response` yang diabaikan oleh Vercel. Runtime Node.js memanggil handler dengan `(req, res)` — respons harus ditulis melalui `res`, bukan dikembalikan. Solusi: ubah ke format `(req, res)` dengan konversi manual antara `IncomingMessage` / `ServerResponse` dan Web API.

**`src/routes/__root.tsx`**
- Vercel Analytics dimuat via `<script defer src="/_vercel/insights/script.js">` di konfigurasi `head`, bukan melalui package npm `@vercel/analytics`. Package tersebut tidak ada di `bun.lock` sehingga tidak pernah diinstall oleh Vercel, menyebabkan error build Rollup.

**`public/favicon.png` & `public/favicon.ico`**
- Favicon diunduh dari `consina.com` (16×16 PNG). Ditambahkan juga sebagai `.ico` dan dihubungkan via `<link rel="icon">` di `head` root.

**Environment Variables (konfigurasi di Vercel Dashboard)**
- Tambahkan `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, dan `SUPABASE_PUBLISHABLE_KEY` di Settings → Environment Variables pada project Vercel. Tanpa ini, Supabase client melempar error saat SSR merender halaman pertama kali.
