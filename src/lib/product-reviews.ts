import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ProductReview = {
  id: string;
  author_name: string;
  rating: number;
  comment: string;
  is_verified_purchase: boolean;
  created_at: string;
};

export function useProductReviews(productId: string | null) {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) {
      setReviews([]);
      setLoading(false);
      return;
    }
    const pid: string = productId;
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("product_reviews")
        .select("id,author_name,rating,comment,is_verified_purchase,created_at")
        .eq("product_id", pid)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setReviews((data ?? []) as ProductReview[]);
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  return { reviews, loading };
}
