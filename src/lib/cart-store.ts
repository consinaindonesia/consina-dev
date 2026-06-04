import { useEffect, useState } from "react";

const KEY = "consina_cart_v1";
const EVT = "consina:cart-changed";

export type CartItem = {
  /** Stable client id — productId + attributes hash */
  key: string;
  productId: string;
  slug: string;
  sku: string;
  name_id: string;
  name_en: string;
  price_idr: number;
  weight_grams: number | null;
  thumbnail: string | null;
  attributes: Record<string, string>;
  quantity: number;
  addedAt: number;
};

function read(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: CartItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(EVT));
}

function makeKey(productId: string, attrs: Record<string, string>): string {
  const sorted = Object.keys(attrs)
    .sort()
    .map((k) => `${k}:${attrs[k]}`)
    .join("|");
  return `${productId}#${sorted}`;
}

export function addToCart(
  item: Omit<CartItem, "key" | "addedAt" | "quantity"> & { quantity?: number },
): CartItem[] {
  const items = read();
  const key = makeKey(item.productId, item.attributes);
  const qty = Math.min(99, Math.max(1, item.quantity ?? 1));
  const existing = items.find((i) => i.key === key);
  if (existing) {
    existing.quantity = Math.min(99, existing.quantity + qty);
  } else {
    items.push({ ...item, key, quantity: qty, addedAt: Date.now() });
  }
  write(items);
  return items;
}

export function removeFromCart(key: string) {
  write(read().filter((i) => i.key !== key));
}

export function updateCartQuantity(key: string, quantity: number) {
  const items = read().map((i) =>
    i.key === key ? { ...i, quantity: Math.min(99, Math.max(1, quantity)) } : i,
  );
  write(items);
}

export function clearCart() {
  write([]);
}

export function getCart(): CartItem[] {
  return read();
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(() => read());
  useEffect(() => {
    const sync = () => setItems(read());
    window.addEventListener(EVT, sync);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) sync();
    };
    window.addEventListener("storage", onStorage);
    sync();
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  const count = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.price_idr * i.quantity, 0);
  const totalWeight = items.reduce(
    (s, i) => s + (i.weight_grams ?? 500) * i.quantity,
    0,
  );
  return { items, count, subtotal, totalWeight };
}