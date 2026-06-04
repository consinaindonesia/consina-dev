import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ItemSchema = z.object({
  name: z.string().min(1).max(255),
  quantity: z.number().int().min(1).max(99),
  weight: z.number().int().min(1).max(100000), // grams per unit
  value: z.number().int().min(0).max(1_000_000_000),
});

const InputSchema = z.object({
  destination_postal_code: z.string().min(3).max(20).optional(),
  destination_area_id: z.string().min(1).max(64).optional(),
  destination_city: z.string().min(1).max(120).optional(),
  couriers: z.string().min(1).max(255).default("jne,jnt,sicepat,anteraja,pos,ide"),
  items: z.array(ItemSchema).min(1).max(50),
});

export type BiteshipRate = {
  courier_code: string;
  courier_name: string;
  courier_service_code: string;
  courier_service_name: string;
  service_type: string;
  duration: string;
  shipment_duration_range: string;
  shipment_duration_unit: string;
  price: number;
};

/**
 * Fetch live courier rates from Biteship.
 * Origin is the workspace's configured origin (BITESHIP_ORIGIN_POSTAL_CODE
 * or BITESHIP_ORIGIN_AREA_ID), falling back to Jakarta (10110).
 */
export const getBiteshipRates = createServerFn({ method: "POST" })
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.BITESHIP_API_KEY;
    if (!apiKey) {
      return { rates: [] as BiteshipRate[], error: "Shipping API not configured" };
    }
    const originPostal = process.env.BITESHIP_ORIGIN_POSTAL_CODE ?? "10110";
    const originAreaId = process.env.BITESHIP_ORIGIN_AREA_ID;

    const body: Record<string, unknown> = {
      couriers: data.couriers,
      items: data.items,
    };
    if (originAreaId) body.origin_area_id = originAreaId;
    else body.origin_postal_code = Number(originPostal);

    if (data.destination_area_id) body.destination_area_id = data.destination_area_id;
    else if (data.destination_postal_code) {
      body.destination_postal_code = Number(data.destination_postal_code);
    } else {
      return { rates: [] as BiteshipRate[], error: "Missing destination" };
    }

    try {
      const res = await fetch("https://api.biteship.com/v1/rates/couriers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: apiKey,
        },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        pricing?: BiteshipRate[];
      };
      if (!res.ok || json.success === false) {
        return { rates: [], error: json.error || `Biteship error ${res.status}` };
      }
      return { rates: json.pricing ?? [], error: null };
    } catch (err) {
      console.error("Biteship rates failed", err);
      return { rates: [] as BiteshipRate[], error: "Could not reach shipping API" };
    }
  });