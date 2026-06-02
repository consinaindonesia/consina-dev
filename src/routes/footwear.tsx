import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/footwear")({
  beforeLoad: () => {
    throw redirect({ to: "/c/$slug", params: { slug: "footwear" }, replace: true });
  },
  component: () => null,
});
