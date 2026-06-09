import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type SerializedSectionRow = {
  id: string;
  page: string;
  section_type: string;
  position: number;
  enabled: boolean;
  /** JSON-stringified settings; parse on consumer side. */
  settings_json: string;
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
      return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
        id: String(r.id),
        page: String(r.page),
        section_type: String(r.section_type),
        position: Number(r.position),
        enabled: Boolean(r.enabled),
        settings_json: JSON.stringify(r.settings ?? {}),
      }));
    } catch {
      return [];
    }
  },
);