import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/produk/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/id/produk/$slug",
      params: { slug: params.slug },
      replace: true,
    });
  },
});
