import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/tents")({
  beforeLoad: () => {
    throw redirect({ to: "/c/$slug", params: { slug: "activities-camping-tenda" }, replace: true });
  },
  component: () => null,
});
