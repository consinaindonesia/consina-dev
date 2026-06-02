import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/accessories")({
  beforeLoad: () => {
    throw redirect({ to: "/c/$slug", params: { slug: "accessories" }, replace: true });
  },
  component: () => null,
});
