import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/en/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const target = new URL("/", request.url);
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
  beforeLoad: () => {
    if (typeof document !== "undefined") {
      document.cookie = `lang=en; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
      window.location.replace("/");
    }
  },
  component: () => null,
});