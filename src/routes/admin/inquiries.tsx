import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { EmptyState } from "@/components/admin/EmptyState";

export const Route = createFileRoute("/admin/inquiries")({
  head: () => ({ meta: [{ title: "Inquiries — Admin" }, { name: "robots", content: "noindex" }] }),
  component: InquiriesPage,
});

function InquiriesPage() {
  return (
    <AdminShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-[Archivo] text-2xl font-black tracking-tight text-primary">Inquiries</h1>
      </div>
      <EmptyState
        icon="MessageSquare"
        title="No inquiries yet"
        description="Customer inquiries will appear here."
      />
    </AdminShell>
  );
}
