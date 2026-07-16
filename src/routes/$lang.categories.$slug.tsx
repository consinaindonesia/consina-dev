import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/$lang/categories/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/c/$slug", params: { slug: params.slug }, replace: true });
  },
  component: () => null,
});
