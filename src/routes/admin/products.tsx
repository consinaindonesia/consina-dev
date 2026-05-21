import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { EmptyState } from "@/components/admin/EmptyState";

export const Route = createFileRoute("/admin/products")({
  head: () => ({ meta: [{ title: "Products — Admin" }, { name: "robots", content: "noindex" }] }),
  component: ProductsPage,
});

function ProductsPage() {
  return (
    <AdminShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-[Archivo] text-2xl font-black tracking-tight text-primary">Products</h1>
      </div>
      <EmptyState
        icon="Package"
        title="No products yet"
        description="Add your first product to get started building your catalog."
        actionLabel="+ New Product"
        actionHref="/admin/products/new"
      />
    </AdminShell>
  );
}
