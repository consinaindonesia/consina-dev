import { createFileRoute } from "@tanstack/react-router";
import { ProductForm } from "@/components/admin/ProductForm";

export const Route = createFileRoute("/admin/products/new")({
  validateSearch: (search: Record<string, unknown>) => ({
    sku: typeof search.sku === "string" ? search.sku : undefined,
    name: typeof search.name === "string" ? search.name : undefined,
    source: typeof search.source === "string" ? search.source : undefined,
  }),
  head: () => ({ meta: [{ title: "New Product — Admin" }, { name: "robots", content: "noindex" }] }),
  component: NewProductPage,
});

function NewProductPage() {
  const search = Route.useSearch();
  return (
    <ProductForm
      mode="new"
      initialPrefill={{
        sku: search.sku,
        name: search.name,
        source: search.source,
      }}
    />
  );
}
