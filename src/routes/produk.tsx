import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/produk")({
  beforeLoad: () => {
    throw redirect({ to: "/catalog", replace: true });
  },
  component: () => null,
});
