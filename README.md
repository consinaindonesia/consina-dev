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

## Deployment (Vercel)

The app uses TanStack Start's SSR pipeline, not a plain SPA build. The Vercel configuration reflects this:

| Setting | Value | Why |
|---|---|---|
| `framework` | `other` | Disables Vercel's Vite SPA preset |
| `outputDirectory` | `dist/client` | Static assets served from the client build |
| `functions.includeFiles` | `dist/server/**` | Bundles the SSR entry into the Lambda |
| `rewrites` | `/(.*) → /api/server` | Routes non-static requests through the SSR handler |

`api/server.mjs` is the Vercel serverless entry point. It imports `dist/server/server.js` (the TanStack Start SSR bundle) and delegates all requests to it. Static files in `dist/client/` are served directly from the CDN before the rewrite is applied.
