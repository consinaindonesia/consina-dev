import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/en/")({
  beforeLoad: () => {
    if (typeof document !== "undefined") {
      document.cookie = `lang=en; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    }
    throw redirect({ to: "/" });
  },
});