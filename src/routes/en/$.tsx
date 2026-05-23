import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/en/$")({
  beforeLoad: ({ params }) => {
    if (typeof document !== "undefined") {
      document.cookie = `lang=en; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    }
    const splat = (params as { _splat?: string })._splat ?? "";
    throw redirect({ to: `/${splat}` as string });
  },
});