import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { EmptyState } from "@/components/admin/EmptyState";

export const Route = createFileRoute("/admin/categories")({
  head: () => ({ meta: [{ title: "Categories — Admin" }, { name: "robots", content: "noindex" }] }),
  component: CategoriesPage,
});

function CategoriesPage() {
  return (
    <AdminShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-[Archivo] text-2xl font-black tracking-tight text-primary">Categories</h1>
      </div>
      <EmptyState
        icon="Folder"
        title="No categories yet"
        description="Create categories to organize your products."
        actionLabel="+ New Category"
        actionHref="/admin/categories/new"
      />
    </AdminShell>
  );
}
