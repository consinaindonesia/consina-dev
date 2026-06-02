import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/carriers")({
  beforeLoad: () => {
    throw redirect({ to: "/c/$slug", params: { slug: "carriers" }, replace: true });
  },
  component: () => null,
});
