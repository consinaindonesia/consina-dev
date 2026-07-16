import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/$lang/catalog")({
  beforeLoad: () => {
    throw redirect({ to: "/catalog", replace: true });
  },
  component: () => null,
});
