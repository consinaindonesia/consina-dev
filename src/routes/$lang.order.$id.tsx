import { createFileRoute } from "@tanstack/react-router";
import { OrderPaymentPage } from "@/pages/OrderPaymentPage";

export const Route = createFileRoute("/$lang/order/$id")({
  head: () => ({
    meta: [
      { title: "Order payment — Consina" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderPaymentPage,
});