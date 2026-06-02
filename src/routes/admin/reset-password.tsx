import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/admin/AuthShell";
import { logAuthEvent } from "@/lib/activity-log.functions";

export const Route = createFileRoute("/admin/reset-password")({
  head: () => ({ meta: [{ title: "Set new password — Consina Admin" }, { name: "robots", content: "noindex" }] }),
  component: ResetPage,
});

type Strength = { label: "Weak" | "Good" | "Strong"; score: 1 | 2 | 3; color: string };

function scorePassword(pw: string): Strength | null {
  if (!pw) return null;
  let score = 0;
  if (pw.length >= 12) score++;
  if (pw.length >= 16) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return { label: "Weak", score: 1, color: "#d9534f" };
  if (score === 3 || score === 4) return { label: "Good", score: 2, color: "#d4b896" };
  return { label: "Strong", score: 3, color: "#1a3a2e" };
}

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [linkInvalid, setLinkInvalid] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // If user arrived without a recovery session, the link is invalid/expired.
    const t = setTimeout(() => {
      void supabase.auth.getSession().then(({ data }) => {
        if (!data.session) setLinkInvalid(true);
      });
    }, 800);
    return () => clearTimeout(t);
  }, []);

  const strength = scorePassword(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password.length < 12) return setErr("Password must be at least 12 characters.");
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password))
      return setErr("Password must include both letters and numbers.");
    if (password !== confirm) return setErr("Passwords do not match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setBusy(false);
      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("expired") || msg.includes("invalid")) {
        setLinkInvalid(true);
      } else {
        setErr(error.message);
      }
      return;
    }
    const { data: u } = await supabase.auth.getUser();
    if (u.user?.email) {
      void logAuthEvent({ data: { email: u.user.email, kind: "password_changed", metadata: { via: "reset_link" } } });
    }
    await supabase.auth.signOut();
    navigate({ to: "/admin/login", search: { reset: "1" } as never });
  }

  if (linkInvalid) {
    return (
      <AuthShell
        title="Reset link expired"
        subtitle="This link is invalid or older than 1 hour."
      >
        <div
          role="alert"
          className="mt-5 rounded-md px-3 py-3 text-sm"
          style={{ backgroundColor: "#fdecec", color: "#b42318", border: "1px solid #f3b4b4" }}
        >
          Please request a new password reset link to continue.
        </div>
        <Link
          to="/admin/forgot-password"
          className="mt-5 flex h-12 w-full items-center justify-center rounded-md text-sm font-semibold text-white md:h-10"
          style={{ backgroundColor: "#1a3a2e" }}
        >
          Request a new link
        </Link>
        <div className="mt-4 text-center">
          <Link to="/admin/login" className="text-xs hover:underline" style={{ color: "#1a3a2e" }}>
            ← Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set a new password" subtitle="Minimum 12 characters, with letters and numbers.">
      {err && (
        <div
          role="alert"
          className="mt-5 rounded-md px-3 py-2 text-sm"
          style={{ backgroundColor: "#fdecec", color: "#b42318", border: "1px solid #f3b4b4" }}
        >
          {err}
        </div>
      )}
      <form onSubmit={handleSubmit} className="mt-5 space-y-4" aria-label="Set new password">
        <div>
          <label
            htmlFor="new-password"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            New password
          </label>
          <input
            id="new-password"
            name="new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            disabled={busy}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 h-12 w-full rounded-md border border-input bg-background px-3 text-base md:h-10 md:text-sm"
          />
          {strength && (
            <div className="mt-2" aria-live="polite">
              <div className="flex gap-1">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-1 flex-1 rounded-full"
                    style={{ backgroundColor: i <= strength.score ? strength.color : "#e8e6df" }}
                  />
                ))}
              </div>
              <p className="mt-1 text-xs" style={{ color: strength.color }}>
                Strength: {strength.label}
              </p>
            </div>
          )}
        </div>
        <div>
          <label
            htmlFor="confirm-password"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Confirm new password
          </label>
          <input
            id="confirm-password"
            name="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            disabled={busy}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
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
          {busy ? "Updating…" : "Update password"}
        </button>
      </form>
    </AuthShell>
  );
}