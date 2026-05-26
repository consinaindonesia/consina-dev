import { useEffect, useState } from "react";

const KEY = "consina_inquiry_v1";
const EVT = "consina:inquiry-changed";

export type InquiryItem = {
  /** Stable client id — combination of productId + attributes hash */
  key: string;
  productId: string;
  slug: string;
  sku: string;
  name_id: string;
  name_en: string;
  price_idr: number;
  thumbnail: string | null;
  attributes: Record<string, string>;
  quantity: number;
  addedAt: number;
};

function read(): InquiryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as InquiryItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: InquiryItem[]) {
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

export function addToInquiry(
  item: Omit<InquiryItem, "key" | "addedAt" | "quantity"> & { quantity?: number },
): InquiryItem[] {
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

export function removeFromInquiry(key: string) {
  write(read().filter((i) => i.key !== key));
}

export function updateQuantity(key: string, quantity: number) {
  const items = read().map((i) =>
    i.key === key ? { ...i, quantity: Math.min(99, Math.max(1, quantity)) } : i,
  );
  write(items);
}

export function clearInquiry() {
  write([]);
}

export function getInquiry(): InquiryItem[] {
  return read();
}

export function getInquiryCount(): number {
  return read().reduce((sum, i) => sum + i.quantity, 0);
}

/** React hook subscribing to inquiry changes (same-tab + cross-tab). */
export function useInquiry() {
  const [items, setItems] = useState<InquiryItem[]>(() => read());

  useEffect(() => {
    const sync = () => setItems(read());
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", (e) => {
      if (e.key === KEY) sync();
    });
    sync();
    return () => {
      window.removeEventListener(EVT, sync);
    };
  }, []);

  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  return { items, count };
}