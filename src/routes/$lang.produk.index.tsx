import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/$lang/produk/")({
  beforeLoad: () => {
    throw redirect({ to: "/catalog", replace: true });
  },
  component: () => null,
});
