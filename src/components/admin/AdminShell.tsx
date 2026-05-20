import { useEffect, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { supabase } from "@/integrations/supabase/client";

export function AdminShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { loading, session, profile } = useAdminAuth();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/admin/login" });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <p className="text-sm">Signed in, but this account isn't registered as a Consina admin.</p>
          <button
            onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/admin/login" }); }}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >Sign out</button>
        </div>
      </div>
    );
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-4 md:px-8">
          <Link to="/admin" className="font-[Archivo] text-lg font-black tracking-tight text-primary">
            Consina · Admin
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <div className="hidden text-right sm:block">
              <p className="font-semibold text-primary">{profile.full_name ?? profile.email}</p>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{profile.role}</p>
            </div>
            <button
              onClick={signOut}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider hover:bg-muted"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1280px] px-4 py-10 md:px-8">{children}</main>
    </div>
  );
}