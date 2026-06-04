import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const KEY = "consina_wishlist_v1";
const EVT = "consina:wishlist-changed";

function readLocal(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]).filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeLocal(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(Array.from(new Set(ids))));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function clearLocalWishlist() {
  writeLocal([]);
}

/** Merge any guest wishlist into the user's account. Best-effort. */
export async function mergeGuestWishlist(userId: string) {
  const local = readLocal();
  if (local.length === 0) return;
  const rows = local.map((product_id) => ({ user_id: userId, product_id }));
  await supabase.from("wishlists").upsert(rows, { onConflict: "user_id,product_id", ignoreDuplicates: true });
  clearLocalWishlist();
}

export function useWishlist(userId: string | null) {
  const [ids, setIds] = useState<string[]>(() => readLocal());
  const [ready, setReady] = useState(!userId);

  useEffect(() => {
    let cancelled = false;
    if (userId) {
      setReady(false);
      void supabase
        .from("wishlists")
        .select("product_id")
        .eq("user_id", userId)
        .then(({ data }) => {
          if (cancelled) return;
          setIds((data ?? []).map((r: { product_id: string }) => r.product_id));
          setReady(true);
        });
    } else {
      setIds(readLocal());
      setReady(true);
      const sync = () => setIds(readLocal());
      window.addEventListener(EVT, sync);
      const onStorage = (e: StorageEvent) => {
        if (e.key === KEY) sync();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        cancelled = true;
        window.removeEventListener(EVT, sync);
        window.removeEventListener("storage", onStorage);
      };
    }
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const has = (productId: string) => ids.includes(productId);

  const toggle = async (productId: string) => {
    if (userId) {
      if (ids.includes(productId)) {
        setIds((cur) => cur.filter((x) => x !== productId));
        await supabase.from("wishlists").delete().match({ user_id: userId, product_id: productId });
      } else {
        setIds((cur) => [...cur, productId]);
        await supabase.from("wishlists").upsert({ user_id: userId, product_id: productId }, { onConflict: "user_id,product_id", ignoreDuplicates: true });
      }
    } else {
      const next = ids.includes(productId) ? ids.filter((x) => x !== productId) : [...ids, productId];
      writeLocal(next);
      setIds(next);
    }
  };

  return { ids, has, toggle, ready, count: ids.length };
}

/** Lightweight read-only hook for the heart icon — avoids fetching the full list each mount. */
export function useWishlistIds(userId: string | null) {
  return useWishlist(userId);
}