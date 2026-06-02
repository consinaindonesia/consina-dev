import { createFileRoute } from "@tanstack/react-router";
import { CheckoutPage } from "@/pages/CheckoutPage";

export const Route = createFileRoute("/$lang/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Consina" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});