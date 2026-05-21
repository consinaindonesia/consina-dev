import { createFileRoute } from "@tanstack/react-router";
import { ProductForm } from "@/components/admin/ProductForm";

export const Route = createFileRoute("/admin/products/$id/edit")({
  head: () => ({ meta: [{ title: "Edit Product — Admin" }, { name: "robots", content: "noindex" }] }),
  component: EditProductPage,
});

function EditProductPage() {
  const { id } = Route.useParams();
  return <ProductForm mode="edit" productId={id} />;
}