import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — Consina Admin" }, { name: "robots", content: "noindex" }] }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/reset-password`,
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-sm">
        <h1 className="font-[Archivo] text-2xl font-black tracking-tight text-primary">Reset password</h1>
        <p className="mt-1 text-sm text-muted-foreground">We'll email you a link valid for 1 hour.</p>
        {sent ? (
          <p className="mt-6 text-sm">Check your inbox for a reset link.</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@consina.com"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            {err && <p className="text-sm text-destructive">{err}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}
        <Link to="/admin/login" className="mt-4 inline-block text-xs text-muted-foreground hover:underline">
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
}