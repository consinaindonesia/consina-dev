import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Anonymize last octet (IPv4) or last hextet (IPv6) for privacy. */
function anonymizeIp(raw: string | null): string | null {
  if (!raw) return null;
  const ip = raw.split(",")[0].trim();
  if (!ip) return null;
  if (ip.includes(":")) {
    const parts = ip.split(":");
    if (parts.length > 1) parts[parts.length - 1] = "0";
    return parts.join(":");
  }
  const parts = ip.split(".");
  if (parts.length === 4) {
    parts[3] = "0";
    return parts.join(".");
  }
  return ip;
}

const AuthEventSchema = z.object({
  email: z.string().email().max(255),
  kind: z.enum([
    "login_success",
    "login_failed",
    "password_reset_requested",
    "password_changed",
  ]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Log auth events (login success/failure, password reset/change).
 * Public on purpose — must work pre-login. IP + UA are read from the
 * incoming request headers on the server, not trusted from the client.
 */
export const logAuthEvent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AuthEventSchema.parse(input))
  .handler(async ({ data }) => {
    try {
      const req = getRequest();
      const h = req.headers;
      const rawIp =
        h.get("cf-connecting-ip") ||
        h.get("x-forwarded-for") ||
        h.get("x-real-ip") ||
        null;
      const ip = anonymizeIp(rawIp);
      const ua = h.get("user-agent")?.slice(0, 500) ?? null;

      // Best-effort: find admin_user by email (may be null for unknown / failed logins)
      const { data: adminRow } = await supabaseAdmin
        .from("admin_users")
        .select("id")
        .eq("email", data.email)
        .maybeSingle();

      const { error } = await supabaseAdmin.from("activity_log").insert({
        admin_user_id: adminRow?.id ?? null,
        action: data.kind,
        entity_type: "auth",
        entity_id: adminRow?.id ?? null,
        ip_address: ip,
        user_agent: ua,
        metadata: { email: data.email, ...(data.metadata ?? {}) },
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "unknown" };
    }
  });