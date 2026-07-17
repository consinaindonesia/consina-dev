import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/products/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/en/products/$slug",
      params: { slug: params.slug },
      replace: true,
    });
  },
});
