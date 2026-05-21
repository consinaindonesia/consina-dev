import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AdminProfile = {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "editor";
  preferred_language: "en" | "id";
};

export function useAdminAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (!s?.user) {
        setProfile(null);
        return;
      }
      // Defer profile fetch to avoid deadlocks inside the listener
      setTimeout(() => {
        void supabase
          .from("admin_users")
          .select("id,email,full_name,role,preferred_language")
          .eq("email", s.user.email!)
          .maybeSingle()
          .then(({ data }) => setProfile((data as AdminProfile) ?? null));
      }, 0);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        void supabase
          .from("admin_users")
          .select("id,email,full_name,role,preferred_language")
          .eq("email", data.session.user.email!)
          .maybeSingle()
          .then(({ data: p }) => {
            setProfile((p as AdminProfile) ?? null);
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user, profile, loading };
}

/** Records a login attempt in activity_log. Best-effort, never throws. */
export async function logLoginAttempt(email: string, success: boolean) {
  try {
    // Find the admin_user id if it exists (may be null for unknown emails)
    const { data } = await supabase
      .from("admin_users")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    await supabase.from("activity_log").insert({
      admin_user_id: data?.id ?? null,
      action: success ? "created" : "deleted",
      entity_type: "admin_user",
      entity_id: data?.id ?? null,
    });
  } catch {
    // ignore — auditing is best-effort
  }
}