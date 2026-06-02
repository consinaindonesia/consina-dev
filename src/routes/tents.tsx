import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/tents")({
  beforeLoad: () => {
    throw redirect({ to: "/c/$slug", params: { slug: "tents" }, replace: true });
  },
  component: () => null,
});
