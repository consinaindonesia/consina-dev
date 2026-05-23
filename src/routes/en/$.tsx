import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/en/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const splat = (params as { _splat?: string })._splat ?? "";
        const target = new URL(`/${splat}`, request.url);
        return new Response(null, {
          status: 302,
          headers: {
            Location: target.toString(),
            "Set-Cookie": `lang=en; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`,
          },
        });
      },
    },
  },
  beforeLoad: ({ params }) => {
    if (typeof document !== "undefined") {
      document.cookie = `lang=en; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
      const splat = (params as { _splat?: string })._splat ?? "";
      window.location.replace(`/${splat}`);
    }
  },
  component: () => null,
});