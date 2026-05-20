import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminAuth } from "@/hooks/use-admin-auth";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin — Consina" }, { name: "robots", content: "noindex" }] }),
  component: AdminHome,
});

function AdminHome() {
  const { profile } = useAdminAuth();
  return (
    <AdminShell>
      <h1 className="font-[Archivo] text-3xl font-black tracking-tight text-primary">
        Welcome back, {profile?.full_name ?? "Admin"}.
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Role: <span className="font-semibold uppercase tracking-wider">{profile?.role}</span>
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { t: "Products", d: "Manage the catalog" },
          { t: "Categories", d: "Organize the lineup" },
          { t: "Stores", d: "150+ retail locations" },
          { t: "Inquiries", d: "Customer messages" },
          ...(profile?.role === "admin" ? [{ t: "Admin Users", d: "Team & permissions" }, { t: "Activity Log", d: "Audit trail" }] : []),
        ].map((c) => (
          <div key={c.t} className="rounded-lg border border-border bg-card p-5">
            <p className="font-[Archivo] text-lg font-bold text-primary">{c.t}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.d}</p>
            <p className="mt-3 text-[10px] uppercase tracking-wider text-secondary">Coming soon</p>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}