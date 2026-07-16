import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/$lang/products/")({
  beforeLoad: () => {
    throw redirect({ to: "/catalog", replace: true });
  },
  component: () => null,
});
