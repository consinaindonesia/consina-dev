import { createFileRoute } from "@tanstack/react-router";
import { ProductForm } from "@/components/admin/ProductForm";

type Tab = "basic" | "translations" | "images";

export const Route = createFileRoute("/admin/products/$id/edit")({
  head: () => ({ meta: [{ title: "Edit Product — Admin" }, { name: "robots", content: "noindex" }] }),
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } => {
    const v = s.tab;
    return v === "basic" || v === "translations" || v === "images" ? { tab: v } : {};
  },
  component: EditProductPage,
});

function EditProductPage() {
  const { id } = Route.useParams();
  const { tab } = Route.useSearch();
  return <ProductForm mode="edit" productId={id} initialTab={tab} />;
}