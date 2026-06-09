import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type SerializedSectionRow = {
  id: string;
  page: string;
  section_type: string;
  position: number;
  enabled: boolean;
  settings: unknown;
};

export const loadHomeSections = createServerFn({ method: "GET" }).handler(
  async (): Promise<SerializedSectionRow[]> => {
    try {
      const { data } = await supabaseAdmin
        .from("page_sections")
        .select("id,page,section_type,position,enabled,settings")
        .eq("page", "home")
        .eq("enabled", true)
        .order("position", { ascending: true });
      return ((data ?? []) as unknown[]).map((r) => r as SerializedSectionRow);
    } catch {
      return [];
    }
  },
);