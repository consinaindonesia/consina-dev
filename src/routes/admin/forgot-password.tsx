import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/admin/AuthShell";

export const Route = createFileRoute("/admin/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — Consina Admin" }, { name: "robots", content: "noindex" }] }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const mountedAt = useRef<number>(Date.now());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (Date.now() - mountedAt.current < 1000) return;
    setBusy(true);
    // Fire-and-forget so we never reveal whether the email exists
    void supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/reset-password`,
    });
    // Always show the same neutral confirmation
    setTimeout(() => {
      setBusy(false);
      setSent(true);
    }, 600);
  }

  return (
    <AuthShell title="Reset your password" subtitle="Enter the email tied to your admin account.">
      {sent ? (
        <div
          role="status"
          className="mt-5 rounded-md px-3 py-3 text-sm"
          style={{ backgroundColor: "#eef6ef", color: "#1a3a2e", border: "1px solid #c7e0ca" }}
        >
          If an account exists for that email, a reset link has been sent. Please check your inbox.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4" aria-label="Forgot password">
          <div>
            <label
              htmlFor="forgot-email"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Email
            </label>
            <input
              id="forgot-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              disabled={busy}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 h-12 w-full rounded-md border border-input bg-background px-3 text-base md:h-10 md:text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-md text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60 md:h-10"
            style={{ backgroundColor: "#1a3a2e" }}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
      <div className="mt-5 text-center">
        <Link to="/admin/login" className="text-xs hover:underline" style={{ color: "#1a3a2e" }}>
          ← Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
}