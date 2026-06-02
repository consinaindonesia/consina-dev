import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/apparel")({
  beforeLoad: () => {
    throw redirect({ to: "/c/$slug", params: { slug: "apparel" }, replace: true });
  },
  component: () => null,
});
