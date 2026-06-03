import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PublicProduct = {
  id: string;
  sku: string;
  slug: string | null;
  name_en: string;
  name_id: string;
  short_description_en: string | null;
  short_description_id: string | null;
  price_idr: number;
  is_featured: boolean;
  category_id: string | null;
  category_slug: string | null;
  category_name_en: string | null;
  category_name_id: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  variants: Array<{ color_hex: string; color_name: string }>;
};

type RawRow = {
  id: string;
  sku: string;
  slug: string | null;
  name_en: string;
  name_id: string;
  short_description_en: string | null;
  short_description_id: string | null;
  price_idr: number;
  is_featured: boolean;
  category_id: string | null;
  images: string[] | null;
  categories: { slug: string; name_en: string; name_id: string } | null;
  product_images: Array<{
    image_url: string;
    thumbnail_url: string | null;
    is_primary: boolean;
    sort_order: number;
  }> | null;
  product_variants: Array<{
    color_hex: string;
    color_name: string;
    sort_order: number;
  }> | null;
};

function normalize(rows: RawRow[]): PublicProduct[] {
  return rows.map((r) => {
    const imgs = (r.product_images ?? []).slice().sort(
      (a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.sort_order - b.sort_order,
    );
    const top = imgs[0];
    const flatTop = !top && Array.isArray(r.images) && r.images.length > 0 ? r.images[0] : null;
    const variants = (r.product_variants ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((v) => ({ color_hex: v.color_hex, color_name: v.color_name }));
    return {
      id: r.id,
      sku: r.sku,
      slug: r.slug ?? null,
      name_en: r.name_en,
      name_id: r.name_id,
      short_description_en: r.short_description_en,
      short_description_id: r.short_description_id,
      price_idr: r.price_idr,
      is_featured: r.is_featured,
      category_id: r.category_id,
      category_slug: r.categories?.slug ?? null,
      category_name_en: r.categories?.name_en ?? null,
      category_name_id: r.categories?.name_id ?? null,
      image_url: top?.image_url ?? flatTop ?? null,
      thumbnail_url: top?.thumbnail_url ?? top?.image_url ?? flatTop ?? null,
      variants,
    };
  });
}

export function usePublicProducts() {
  const [data, setData] = useState<PublicProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data: rows } = await supabase
        .from("products")
        .select(
          "id,sku,slug,name_en,name_id,short_description_en,short_description_id,price_idr,is_featured,category_id,images,categories(slug,name_en,name_id),product_images(image_url,thumbnail_url,is_primary,sort_order),product_variants(color_hex,color_name,sort_order)",
        )
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("name_en", { ascending: true });
      if (cancelled) return;
      setData(normalize((rows ?? []) as unknown as RawRow[]));
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { products: data, loading };
}

export function getSiteUrl(): string {
  const env = (import.meta.env.VITE_SITE_URL as string | undefined) ?? "";
  if (env) return env.replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return "";
}
