import { supabase } from "@/integrations/supabase/client";

export type ShippingZone = {
  id: string;
  region_name: string;
  cities: string[];
  is_default: boolean;
  base_cost_idr: number;
  per_kg_cost_idr: number;
  delivery_days_min: number;
  delivery_days_max: number;
};

export type ShippingMethod = {
  id: string;
  name: string;
  code: string | null;
  multiplier: number;
};

export type ShippingQuote = {
  method: ShippingMethod;
  zone: ShippingZone;
  cost_idr: number;
  delivery_days_min: number;
  delivery_days_max: number;
};

export async function fetchShippingOptions(): Promise<{
  zones: ShippingZone[];
  methods: ShippingMethod[];
}> {
  const [{ data: z }, { data: m }] = await Promise.all([
    supabase
      .from("shipping_zones")
      .select(
        "id, region_name, cities, is_default, base_cost_idr, per_kg_cost_idr, delivery_days_min, delivery_days_max",
      )
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("shipping_methods")
      .select("id, name, code, multiplier")
      .eq("is_active", true)
      .order("sort_order"),
  ]);
  return {
    zones: (z ?? []) as ShippingZone[],
    methods: (m ?? []) as ShippingMethod[],
  };
}

/** Pick the zone whose `cities` array contains the customer's city (case-insensitive), else the default zone. */
export function pickZone(zones: ShippingZone[], city: string): ShippingZone | null {
  const c = city.trim().toLowerCase();
  if (c) {
    const match = zones.find((z) =>
      z.cities.some((cc) => cc.trim().toLowerCase() === c),
    );
    if (match) return match;
  }
  return zones.find((z) => z.is_default) ?? zones[0] ?? null;
}

/** Round IDR to nearest 500 to keep the number tidy. */
function roundIdr(n: number): number {
  return Math.round(n / 500) * 500;
}

export function quoteShipping(
  zone: ShippingZone,
  method: ShippingMethod,
  totalWeightGrams: number,
): ShippingQuote {
  const kg = Math.max(0.5, totalWeightGrams / 1000); // min chargeable 0.5kg
  const raw = zone.base_cost_idr + Math.ceil(kg) * zone.per_kg_cost_idr;
  const cost = roundIdr(raw * (method.multiplier ?? 1));
  return {
    method,
    zone,
    cost_idr: cost,
    delivery_days_min: zone.delivery_days_min,
    delivery_days_max: zone.delivery_days_max,
  };
}