import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PublicCategory = {
  id: string;
  slug: string;
  name_id: string;
  name_en: string;
  parent_category_id: string | null;
  sort_order: number;
  children: PublicCategory[];
};

async function fetchCategoryTree(): Promise<PublicCategory[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id,slug,name_id,name_en,parent_category_id,sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as Omit<PublicCategory, "children">[];
  const map = new Map<string, PublicCategory>();
  rows.forEach((r) => map.set(r.id, { ...r, children: [] }));
  const roots: PublicCategory[] = [];
  for (const node of map.values()) {
    if (node.parent_category_id && map.has(node.parent_category_id)) {
      map.get(node.parent_category_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortRec = (arr: PublicCategory[]) => {
    arr.sort((a, b) => a.sort_order - b.sort_order);
    arr.forEach((c) => sortRec(c.children));
  };
  sortRec(roots);
  return roots;
}

export function usePublicCategories() {
  return useQuery({
    queryKey: ["public-categories-tree"],
    queryFn: fetchCategoryTree,
    staleTime: 60_000,
  });
}