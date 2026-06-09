import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import "@/i18n";
import { CookieBanner } from "@/components/CookieBanner";
import { useRouterState } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { ThemeStyle } from "@/components/site/ThemeStyle";
import { loadThemeSettings, type ThemeHeadPayload } from "@/lib/theme-load.functions";
import { googleFontHref, themeToCss, DEFAULT_THEME } from "@/lib/theme-defaults";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: async (): Promise<ThemeHeadPayload> => {
    try {
      return await loadThemeSettings();
    } catch {
      return { theme: DEFAULT_THEME, fontHref: googleFontHref(DEFAULT_THEME), fontPreloads: [] };
    }
  },
  head: ({ loaderData }) => {
    const theme = loaderData?.theme ?? DEFAULT_THEME;
    const fontHref = loaderData?.fontHref ?? "";
    const fontPreloads = loaderData?.fontPreloads ?? [];
    const fontPreloadLinks = fontPreloads.map((href) => ({
      rel: "preload" as const,
      href,
      as: "font" as const,
      type: "font/woff2",
      crossOrigin: "anonymous" as const,
    }));
    return ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Consina — The Outdoor Lifestyle" },
      { name: "description", content: "Consina: Indonesian outdoor gear since 1999. Backpack carriers, tents, apparel, footwear and accessories — inspired by experience." },
      { name: "author", content: "Consina" },
      { property: "og:title", content: "Consina — The Outdoor Lifestyle" },
      { property: "og:description", content: "Consina: Indonesian outdoor gear since 1999. Backpack carriers, tents, apparel, footwear and accessories — inspired by experience." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@consina" },
      { name: "twitter:title", content: "Consina — The Outdoor Lifestyle" },
      { name: "twitter:description", content: "Consina: Indonesian outdoor gear since 1999. Backpack carriers, tents, apparel, footwear and accessories — inspired by experience." },
    ],
    links: [
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", href: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { rel: "icon", href: "/favicon-16.png", type: "image/png", sizes: "16x16" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "icon", href: "/favicon-512.png", type: "image/png", sizes: "512x512" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      ...fontPreloadLinks,
      ...(fontHref ? [{ rel: "stylesheet", href: fontHref }] : []),
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
    scripts: [{ src: "/_vercel/insights/script.js", defer: true }],
    styles: [{ children: themeToCss(theme) }],
  });
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = pathname.startsWith("/admin");

  return (
    <QueryClientProvider client={queryClient}>
      {!isAdmin && <ThemeStyle />}
      <Outlet />
      {!isAdmin && <CookieBanner />}
      <Toaster richColors position="top-right" closeButton />
    </QueryClientProvider>
  );
}
