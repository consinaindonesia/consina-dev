import { createFileRoute } from "@tanstack/react-router";
import { ProductForm } from "@/components/admin/ProductForm";

export const Route = createFileRoute("/admin/products/new")({
  head: () => ({ meta: [{ title: "New Product — Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => <ProductForm mode="new" />,
});