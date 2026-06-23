import { supabaseAdmin } from "@/integrations/supabase/client.server";

type JsonRecord = Record<string, unknown>;
type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

type InventoryTarget =
  | {
      kind: "product";
      productId: string;
      stock: number;
      sku: string;
    }
  | {
      kind: "variant";
      productId: string;
      variantId: string;
      stock: number;
      sku: string;
    }
  | {
      kind: "size_variant";
      productId: string;
      sizeVariantId: string;
      stock: number;
      sku: string;
    };

type NormalizedLine = {
  sku: string;
  stock?: number;
  delta?: number;
  quantity?: number;
  locationCode?: string | null;
  reference?: string | null;
  raw: JsonRecord;
};

type SyncPayload = {
  eventId: string | null;
  eventType: string;
  reference: string | null;
  occurredAt: string | null;
  lines: NormalizedLine[];
  raw: JsonRecord;
};

type OdooConfigStatus = {
  configured: boolean;
  baseUrl: string | null;
  database: string | null;
  username: string | null;
  missing: string[];
};

function readEnv(name: string): string | undefined {
  return process.env[name] || undefined;
}

function getWebhookSecret(): string | undefined {
  return (
    readEnv("ODOO_WEBHOOK_SECRET") ??
    readEnv("ODOO_API_KEY") ??
    process.env["api_key_odoo"] ??
    process.env["API_KEY_ODOO"] ??
    undefined
  );
}

function getOdooBaseUrl(): string | undefined {
  return (
    readEnv("ODOO_BASE_URL") ??
    readEnv("VITE_ODOO_BASE_URL") ??
    process.env["odoo_base_url"] ??
    "https://dev.consina.cloud"
  );
}

function getOdooDatabase(): string | undefined {
  return (
    readEnv("ODOO_DATABASE") ??
    readEnv("ODOO_DB") ??
    process.env["odoo_database"] ??
    process.env["odoo_db"] ??
    "odoo19test"
  );
}

function getOdooUsername(): string | undefined {
  return (
    readEnv("ODOO_USERNAME") ??
    readEnv("ODOO_LOGIN") ??
    process.env["odoo_username"] ??
    process.env["odoo_login"] ??
    "super@consina.co.id"
  );
}

function getOdooApiKey(): string | undefined {
  return (
    readEnv("ODOO_API_KEY") ??
    process.env["api_key_odoo"] ??
    process.env["API_KEY_ODOO"] ??
    undefined
  );
}

export function getOdooConfigStatus(): OdooConfigStatus {
  const baseUrl = getOdooBaseUrl()?.trim() || null;
  const database = getOdooDatabase()?.trim() || null;
  const username = getOdooUsername()?.trim() || null;
  const apiKey = getOdooApiKey()?.trim() || null;
  const missing = [
    ...(baseUrl ? [] : ["ODOO_BASE_URL"]),
    ...(database ? [] : ["ODOO_DATABASE"]),
    ...(username ? [] : ["ODOO_USERNAME"]),
    ...(apiKey ? [] : ["ODOO_API_KEY"]),
  ];

  return {
    configured: missing.length === 0,
    baseUrl,
    database,
    username,
    missing,
  };
}

export function assertOdooWebhookAuthorized(request: Request) {
  const expected = getWebhookSecret();
  if (!expected) {
    throw new Error(
      "Missing Odoo webhook secret. Set ODOO_WEBHOOK_SECRET or ODOO_API_KEY/api_key_odoo.",
    );
  }

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const apiKey =
    request.headers.get("x-odoo-api-key") ??
    request.headers.get("x-webhook-secret") ??
    request.headers.get("x-api-key");

  const provided = bearer || apiKey;
  if (!provided || provided !== expected) {
    const err = new Error("Unauthorized webhook");
    err.name = "UnauthorizedWebhookError";
    throw err;
  }
}

function normalizeSku(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function toOptionalNumber(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function deriveStockStatus(stock: number): StockStatus {
  if (!stock || stock <= 0) return "out_of_stock";
  if (stock <= 5) return "low_stock";
  return "in_stock";
}

function toJsonRecord(value: unknown): JsonRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonRecord;
  }
  return {};
}

export async function parseOdooInventoryPayload(request: Request): Promise<SyncPayload> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    throw new Error("Invalid JSON payload");
  }

  const raw = toJsonRecord(payload);
  const eventId =
    String(raw.event_id ?? raw.id ?? raw.sync_id ?? raw.webhook_id ?? "").trim() || null;
  const eventType =
    String(raw.event_type ?? raw.type ?? raw.operation ?? "stock_update").trim() ||
    "stock_update";
  const reference =
    String(raw.reference ?? raw.name ?? raw.picking_name ?? raw.document_no ?? "").trim() ||
    null;
  const occurredAt =
    String(raw.occurred_at ?? raw.timestamp ?? raw.updated_at ?? raw.date ?? "").trim() || null;

  const items = Array.isArray(raw.items)
    ? raw.items
    : Array.isArray(raw.lines)
      ? raw.lines
      : Array.isArray(raw.products)
        ? raw.products
        : [];

  const lines: NormalizedLine[] = items
    .map((entry) => {
      const row = toJsonRecord(entry);
      const sku = normalizeSku(row.sku ?? row.default_code ?? row.internal_reference ?? row.barcode);
      const stock = toOptionalNumber(row.stock ?? row.qty_available ?? row.on_hand ?? row.available_qty);
      const delta = toOptionalNumber(row.delta ?? row.quantity_delta ?? row.qty_delta);
      const quantity = toOptionalNumber(row.quantity ?? row.qty ?? row.move_qty);
      const locationCode =
        String(row.location_code ?? row.location ?? row.warehouse_code ?? "").trim() || null;
      const lineReference =
        String(row.reference ?? row.move_reference ?? row.name ?? "").trim() || null;

      return {
        sku,
        stock,
        delta,
        quantity,
        locationCode,
        reference: lineReference,
        raw: row,
      };
    })
    .filter((line) => line.sku);

  if (!lines.length) {
    throw new Error("No inventory lines with SKU found in payload");
  }

  return { eventId, eventType, reference, occurredAt, lines, raw };
}

type OdooRpcResponse<T> =
  | { jsonrpc: "2.0"; id: number; result: T }
  | { jsonrpc: "2.0"; id: number; error: { code: number; message: string; data?: unknown } };

async function callOdooJsonRpc<T>(body: JsonRecord): Promise<T> {
  const config = getOdooConfigStatus();
  const apiKey = getOdooApiKey();
  if (!config.configured || !apiKey || !config.baseUrl) {
    throw new Error(
      `Odoo config incomplete: ${config.missing.join(", ") || "unknown configuration issue"}`,
    );
  }

  const res = await fetch(`${config.baseUrl.replace(/\/+$/, "")}/jsonrpc`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      id: Date.now(),
      params: body,
    }),
  });

  const json = (await res.json()) as OdooRpcResponse<T>;
  if (!res.ok) {
    throw new Error(`Odoo HTTP error (${res.status})`);
  }
  if ("error" in json && json.error) {
    throw new Error(json.error.message || "Odoo RPC error");
  }
  return json.result;
}

async function authenticateOdoo(): Promise<{
  uid: number;
  baseUrl: string;
  database: string;
  username: string;
  apiKey: string;
}> {
  const config = getOdooConfigStatus();
  const apiKey = getOdooApiKey();
  if (!config.configured || !apiKey || !config.baseUrl || !config.database || !config.username) {
    throw new Error(
      `Odoo config incomplete: ${config.missing.join(", ") || "unknown configuration issue"}`,
    );
  }

  const uid = await callOdooJsonRpc<number>({
    service: "common",
    method: "authenticate",
    args: [config.database, config.username, apiKey, {}],
  });

  if (!uid) {
    throw new Error("Odoo authentication failed. Check ODOO_DATABASE, ODOO_USERNAME, and ODOO_API_KEY.");
  }

  return {
    uid,
    baseUrl: config.baseUrl,
    database: config.database,
    username: config.username,
    apiKey,
  };
}

type OdooProductRow = {
  id: number;
  name?: string;
  default_code?: string | null;
  barcode?: string | null;
  qty_available?: number | null;
  virtual_available?: number | null;
  write_date?: string | null;
};

export async function fetchOdooInventorySnapshot(limit = 1000): Promise<SyncPayload> {
  const session = await authenticateOdoo();
  const result = await callOdooJsonRpc<OdooProductRow[]>({
    service: "object",
    method: "execute_kw",
    args: [
      session.database,
      session.uid,
      session.apiKey,
      "product.product",
      "search_read",
      [[["active", "=", true], ["default_code", "!=", false]]],
      {
        fields: [
          "id",
          "name",
          "default_code",
          "barcode",
          "qty_available",
          "virtual_available",
          "write_date",
        ],
        limit,
        order: "write_date desc",
      },
    ],
  });

  const snapshotId = `manual-${Date.now()}`;
  const lines: NormalizedLine[] = (result ?? [])
    .map((row) => {
      const sku = normalizeSku(row.default_code ?? row.barcode);
      if (!sku) return null;
      return {
        sku,
        stock: toOptionalNumber(row.qty_available ?? 0),
        reference: row.name ?? null,
        raw: {
          id: row.id,
          name: row.name,
          default_code: row.default_code,
          barcode: row.barcode,
          qty_available: row.qty_available,
          virtual_available: row.virtual_available,
          write_date: row.write_date,
        },
      };
    })
    .filter((line): line is NormalizedLine => Boolean(line));

  return {
    eventId: snapshotId,
    eventType: "manual_snapshot",
    reference: "Odoo manual snapshot",
    occurredAt: new Date().toISOString(),
    lines,
    raw: {
      source: "odoo-jsonrpc",
      database: session.database,
      username: session.username,
      fetched_at: new Date().toISOString(),
      limit,
      total_records: result?.length ?? 0,
    },
  };
}

async function resolveInventoryTarget(sku: string): Promise<InventoryTarget | null> {
  const normalizedSku = normalizeSku(sku);

  const { data: mappedRows } = await supabaseAdmin
    .from("odoo_product_map" as never)
    .select("product_id, variant_id, size_variant_id")
    .eq("odoo_sku", normalizedSku)
    .eq("is_active", true)
    .order("sync_priority", { ascending: true });

  const mapped = ((mappedRows ?? []) as Array<{
    product_id: string | null;
    variant_id: string | null;
    size_variant_id: string | null;
  }>)[0];

  if (mapped?.size_variant_id) {
    const { data } = await supabaseAdmin
      .from("product_size_variants" as never)
      .select("id, product_id, stock, sku")
      .eq("id", mapped.size_variant_id)
      .maybeSingle();
    if (data) {
      const row = data as { id: string; product_id: string; stock: number; sku: string | null };
      return {
        kind: "size_variant",
        productId: row.product_id,
        sizeVariantId: row.id,
        stock: Number(row.stock ?? 0),
        sku: normalizeSku(row.sku ?? normalizedSku),
      };
    }
  }

  if (mapped?.variant_id) {
    const { data } = await supabaseAdmin
      .from("product_variants" as never)
      .select("id, product_id, stock")
      .eq("id", mapped.variant_id)
      .maybeSingle();
    if (data) {
      const row = data as { id: string; product_id: string; stock: number | null };
      return {
        kind: "variant",
        productId: row.product_id,
        variantId: row.id,
        stock: Number(row.stock ?? 0),
        sku: normalizedSku,
      };
    }
  }

  if (mapped?.product_id) {
    const { data } = await supabaseAdmin
      .from("products")
      .select("id, stock, sku")
      .eq("id", mapped.product_id)
      .maybeSingle();
    if (data) {
      const row = data as { id: string; stock: number; sku: string };
      return {
        kind: "product",
        productId: row.id,
        stock: Number(row.stock ?? 0),
        sku: normalizeSku(row.sku),
      };
    }
  }

  const { data: sizeVariant } = await supabaseAdmin
    .from("product_size_variants" as never)
    .select("id, product_id, stock, sku")
    .eq("sku", normalizedSku)
    .maybeSingle();
  if (sizeVariant) {
    const row = sizeVariant as { id: string; product_id: string; stock: number; sku: string | null };
    return {
      kind: "size_variant",
      productId: row.product_id,
      sizeVariantId: row.id,
      stock: Number(row.stock ?? 0),
      sku: normalizeSku(row.sku ?? normalizedSku),
    };
  }

  const { data: product } = await supabaseAdmin
    .from("products")
    .select("id, stock, sku")
    .eq("sku", normalizedSku)
    .maybeSingle();
  if (product) {
    const row = product as { id: string; stock: number; sku: string };
    return {
      kind: "product",
      productId: row.id,
      stock: Number(row.stock ?? 0),
      sku: normalizeSku(row.sku),
    };
  }

  return null;
}

async function ensureMapping(lineSku: string, target: InventoryTarget) {
  const payload: JsonRecord =
    target.kind === "product"
      ? { odoo_sku: lineSku, product_id: target.productId }
      : target.kind === "variant"
        ? { odoo_sku: lineSku, product_id: target.productId, variant_id: target.variantId }
        : {
            odoo_sku: lineSku,
            product_id: target.productId,
            size_variant_id: target.sizeVariantId,
          };

  await supabaseAdmin.from("odoo_product_map" as never).upsert(payload as never, {
    onConflict: "odoo_sku",
  });
}

async function refreshParentProductStock(productId: string) {
  const { data: sizeRows } = await supabaseAdmin
    .from("product_size_variants" as never)
    .select("stock")
    .eq("product_id", productId);

  const sizeVariants = (sizeRows ?? []) as Array<{ stock: number }>;
  if (sizeVariants.length > 0) {
    const nextStock = sizeVariants.reduce((sum, row) => sum + Number(row.stock ?? 0), 0);
    await supabaseAdmin
      .from("products")
      .update({
        stock: nextStock,
        stock_status: deriveStockStatus(nextStock),
      })
      .eq("id", productId);
    return;
  }

  const { data: variantRows } = await supabaseAdmin
    .from("product_variants" as never)
    .select("stock")
    .eq("product_id", productId);

  const trackedVariants = ((variantRows ?? []) as Array<{ stock: number | null }>).filter(
    (row) => row.stock != null,
  );
  if (trackedVariants.length > 0) {
    const nextStock = trackedVariants.reduce((sum, row) => sum + Number(row.stock ?? 0), 0);
    await supabaseAdmin
      .from("products")
      .update({
        stock: nextStock,
        stock_status: deriveStockStatus(nextStock),
      })
      .eq("id", productId);
  }
}

async function logSyncActivity(args: {
  action: "sync_received" | "sync_applied" | "sync_failed";
  entityId?: string | null;
  metadata?: JsonRecord;
  before?: JsonRecord | null;
  after?: JsonRecord | null;
}) {
  await supabaseAdmin.from("activity_log").insert({
    admin_user_id: null,
    action: args.action,
    entity_type: "inventory_sync",
    entity_id: args.entityId ?? null,
    metadata: args.metadata ?? {},
    before: args.before ?? null,
    after: args.after ?? null,
  } as never);
}

async function insertSyncEvent(args: {
  payload: SyncPayload;
  line: NormalizedLine;
  target: InventoryTarget | null;
  status: "received" | "applied" | "ignored" | "failed";
  changeMode: "absolute" | "delta";
  stockBefore?: number | null;
  stockAfter?: number | null;
  delta?: number | null;
  errorMessage?: string | null;
}) {
  await supabaseAdmin.from("inventory_sync_events" as never).insert({
    source: "odoo",
    event_type: args.payload.eventType,
    external_event_id: args.payload.eventId,
    external_reference: args.line.reference ?? args.payload.reference,
    odoo_sku: args.line.sku,
    odoo_location_code: args.line.locationCode,
    product_id: args.target?.productId ?? null,
    variant_id: args.target?.kind === "variant" ? args.target.variantId : null,
    size_variant_id: args.target?.kind === "size_variant" ? args.target.sizeVariantId : null,
    sync_status: args.status,
    change_mode: args.changeMode,
    stock_before: args.stockBefore ?? null,
    stock_after: args.stockAfter ?? null,
    delta: args.delta ?? null,
    error_message: args.errorMessage ?? null,
    payload: {
      ...args.payload.raw,
      line: args.line.raw,
    },
    processed_at: args.status === "received" ? null : new Date().toISOString(),
  } as never);
}

async function hasProcessedEvent(eventId: string, sku: string) {
  const { data } = await supabaseAdmin
    .from("inventory_sync_events" as never)
    .select("id, sync_status")
    .eq("source", "odoo")
    .eq("external_event_id", eventId)
    .eq("odoo_sku", sku)
    .in("sync_status", ["applied", "ignored"]);

  return ((data ?? []) as Array<{ id: string }>).length > 0;
}

async function applyLineUpdate(payload: SyncPayload, line: NormalizedLine) {
  const changeMode = line.stock != null ? "absolute" : "delta";

  if (payload.eventId && (await hasProcessedEvent(payload.eventId, line.sku))) {
    await insertSyncEvent({
      payload,
      line,
      target: null,
      status: "ignored",
      changeMode,
      errorMessage: "Duplicate external event skipped",
    });
    return { status: "ignored" as const, sku: line.sku };
  }

  const target = await resolveInventoryTarget(line.sku);
  if (!target) {
    await insertSyncEvent({
      payload,
      line,
      target: null,
      status: "failed",
      changeMode,
      errorMessage: `No local product mapping found for SKU ${line.sku}`,
    });
    await logSyncActivity({
      action: "sync_failed",
      metadata: {
        source: "odoo",
        sku: line.sku,
        reason: "mapping_not_found",
        event_id: payload.eventId,
      },
    });
    return { status: "failed" as const, sku: line.sku };
  }

  const currentStock = Number(target.stock ?? 0);
  const deltaRaw = line.delta ?? line.quantity;
  const nextStock =
    line.stock != null
      ? Math.max(0, Math.round(line.stock))
      : Math.max(0, currentStock + Math.round(deltaRaw ?? 0));
  const effectiveDelta = nextStock - currentStock;

  await ensureMapping(line.sku, target);
  await logSyncActivity({
    action: "sync_received",
    entityId: target.productId,
    metadata: {
      source: "odoo",
      sku: line.sku,
      event_id: payload.eventId,
      mode: changeMode,
    },
  });

  if (target.kind === "size_variant") {
    await supabaseAdmin
      .from("product_size_variants" as never)
      .update({ stock: nextStock })
      .eq("id", target.sizeVariantId);
  } else if (target.kind === "variant") {
    await supabaseAdmin
      .from("product_variants" as never)
      .update({ stock: nextStock })
      .eq("id", target.variantId);
  } else {
    await supabaseAdmin
      .from("products")
      .update({
        stock: nextStock,
        stock_status: deriveStockStatus(nextStock),
      })
      .eq("id", target.productId);
  }

  if (target.kind !== "product") {
    await refreshParentProductStock(target.productId);
  }

  await insertSyncEvent({
    payload,
    line,
    target,
    status: "applied",
    changeMode,
    stockBefore: currentStock,
    stockAfter: nextStock,
    delta: effectiveDelta,
  });

  await logSyncActivity({
    action: "sync_applied",
    entityId: target.productId,
    metadata: {
      source: "odoo",
      sku: line.sku,
      event_id: payload.eventId,
      event_type: payload.eventType,
      mode: changeMode,
    },
    before: {
      stock: currentStock,
      stock_status: deriveStockStatus(currentStock),
    },
    after: {
      stock: nextStock,
      stock_status: deriveStockStatus(nextStock),
    },
  });

  return { status: "applied" as const, sku: line.sku, productId: target.productId };
}

export async function processOdooInventoryPayload(payload: SyncPayload) {
  const results = [];

  for (const line of payload.lines) {
    try {
      results.push(await applyLineUpdate(payload, line));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown sync error";
      await insertSyncEvent({
        payload,
        line,
        target: null,
        status: "failed",
        changeMode: line.stock != null ? "absolute" : "delta",
        errorMessage: message,
      });
      await logSyncActivity({
        action: "sync_failed",
        metadata: {
          source: "odoo",
          sku: line.sku,
          event_id: payload.eventId,
          reason: message,
        },
      });
      results.push({ status: "failed" as const, sku: line.sku, error: message });
    }
  }

  const applied = results.filter((row) => row.status === "applied").length;
  const ignored = results.filter((row) => row.status === "ignored").length;
  const failed = results.filter((row) => row.status === "failed").length;

  return {
    ok: failed === 0,
    summary: {
      total: results.length,
      applied,
      ignored,
      failed,
    },
    results,
  };
}
