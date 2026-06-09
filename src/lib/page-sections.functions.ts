import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { PageSectionRow } from "@/lib/section-registry";

export const loadHomeSections = createServerFn({ method: "GET" }).handler(
  async (): Promise<PageSectionRow[]> => {
    try {
      const { data } = await supabaseAdmin
        .from("page_sections")
        .select("id,page,section_type,position,enabled,settings")
        .eq("page", "home")
        .eq("enabled", true)
        .order("position", { ascending: true });
      return (data ?? []) as PageSectionRow[];
    } catch {
      return [];
    }
  },
);