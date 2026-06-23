#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function parseEnv(text) {
  const env = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function uniq(items) {
  return [...new Set(items)];
}

async function upsertInChunks(client, table, rows, size, options = {}) {
  for (const [index, batch] of chunk(rows, size).entries()) {
    const { error } = await client.from(table).upsert(batch, options);
    if (error) {
      throw new Error(`${table} upsert batch ${index + 1} failed: ${error.message}`);
    }
    console.log(`upserted ${table} batch ${index + 1}/${Math.ceil(rows.length / size)} (${batch.length})`);
  }
}

async function insertInChunks(client, table, rows, size) {
  for (const [index, batch] of chunk(rows, size).entries()) {
    const { error } = await client.from(table).insert(batch);
    if (error) {
      throw new Error(`${table} insert batch ${index + 1} failed: ${error.message}`);
    }
    console.log(`inserted ${table} batch ${index + 1}/${Math.ceil(rows.length / size)} (${batch.length})`);
  }
}

async function deleteByIds(client, table, ids, size = 200) {
  if (!ids.length) return;
  for (const [index, batch] of chunk(ids, size).entries()) {
    const { error } = await client.from(table).delete().in("id", batch);
    if (error) {
      throw new Error(`${table} delete batch ${index + 1} failed: ${error.message}`);
    }
    console.log(`deleted ${table} batch ${index + 1}/${Math.ceil(ids.length / size)} (${batch.length})`);
  }
}

async function deleteByProductIds(client, table, productIds, size = 200) {
  if (!productIds.length) return;
  for (const [index, batch] of chunk(productIds, size).entries()) {
    const { error } = await client.from(table).delete().in("product_id", batch);
    if (error) {
      throw new Error(`${table} delete batch ${index + 1} failed: ${error.message}`);
    }
    console.log(`deleted ${table} batch ${index + 1}/${Math.ceil(productIds.length / size)} (${batch.length})`);
  }
}

async function deleteRedirects(client, oldSlugs, size = 300) {
  if (!oldSlugs.length) return;
  for (const [index, batch] of chunk(oldSlugs, size).entries()) {
    const { error } = await client.from("product_slug_redirects").delete().in("old_slug", batch);
    if (error) {
      throw new Error(`product_slug_redirects delete batch ${index + 1} failed: ${error.message}`);
    }
    console.log(`deleted product_slug_redirects batch ${index + 1}/${Math.ceil(oldSlugs.length / size)} (${batch.length})`);
  }
}

async function fetchAllProducts(client) {
  let from = 0;
  const pageSize = 1000;
  const rows = [];
  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await client
      .from("products")
      .select("id, sku, slug")
      .order("sku", { ascending: true })
      .range(from, to);
    if (error) throw new Error(`products fetch failed: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function fetchAllRedirects(client) {
  let from = 0;
  const pageSize = 1000;
  const rows = [];
  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await client
      .from("product_slug_redirects")
      .select("old_slug")
      .order("old_slug", { ascending: true })
      .range(from, to);
    if (error) throw new Error(`redirect fetch failed: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function main() {
  const datasetDir = resolve(process.argv[2] || "tmp/wc_full_reset_sql");
  const envPath = resolve(process.argv[3] || ".env.vercel");
  const env = parseEnv(await readFile(envPath, "utf8"));
  const supabaseUrl = env.SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from env file.");
  }

  const [products, productImages, variants, redirects] = await Promise.all([
    readJson(resolve(datasetDir, "dataset.products.json")),
    readJson(resolve(datasetDir, "dataset.product_images.json")),
    readJson(resolve(datasetDir, "dataset.variants.json")),
    readJson(resolve(datasetDir, "dataset.redirects.json")),
  ]);

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: categoryRows, error: categoryError } = await client
    .from("categories")
    .select("id, slug");
  if (categoryError) throw new Error(`Failed loading categories: ${categoryError.message}`);
  const categoryBySlug = new Map((categoryRows ?? []).map((row) => [row.slug, row.id]));

  const missingCategories = uniq(
    products
      .map((product) => product.category_slug)
      .filter((slug) => slug && !categoryBySlug.has(slug)),
  );
  if (missingCategories.length) {
    throw new Error(`Missing category slugs in database: ${missingCategories.join(", ")}`);
  }

  const productPayload = products.map((product) => ({
    sku: product.sku,
    slug: product.slug,
    category_id: categoryBySlug.get(product.category_slug) ?? null,
    name_id: product.name_id,
    name_en: product.name_en,
    short_description_id: product.short_description_id || null,
    short_description_en: product.short_description_en || null,
    description_id: product.description_id || null,
    description_en: product.description_en || null,
    price_idr: product.price_idr,
    original_price_idr: product.original_price_idr,
    sale_price_idr: product.sale_price_idr,
    is_on_sale: product.is_on_sale,
    discount_percent: product.discount_percent,
    is_featured: product.is_featured,
    stock: product.stock,
    stock_status: product.stock_status,
    images: product.images,
    attributes: product.attributes,
    is_active: true,
  }));

  await upsertInChunks(client, "products", productPayload, 100, { onConflict: "sku" });

  const importedSkus = products.map((product) => product.sku);
  const productIdBySku = new Map();
  for (const skuBatch of chunk(importedSkus, 150)) {
    const { data, error } = await client.from("products").select("id, sku").in("sku", skuBatch);
    if (error) throw new Error(`Failed fetching imported product ids: ${error.message}`);
    for (const row of data ?? []) {
      productIdBySku.set(row.sku, row.id);
    }
  }

  const missingIds = importedSkus.filter((sku) => !productIdBySku.has(sku));
  if (missingIds.length) {
    throw new Error(`Some imported SKUs could not be resolved after upsert: ${missingIds.slice(0, 20).join(", ")}`);
  }

  const importedProductIds = importedSkus.map((sku) => productIdBySku.get(sku));

  await deleteByProductIds(client, "product_categories", importedProductIds);
  await deleteByProductIds(client, "product_images", importedProductIds);
  await deleteByProductIds(client, "product_variants", importedProductIds);

  const productCategoryRows = products
    .map((product) => ({
      product_id: productIdBySku.get(product.sku),
      category_id: categoryBySlug.get(product.category_slug) ?? null,
      is_primary: true,
    }))
    .filter((row) => row.product_id && row.category_id);

  const productImageRows = [];
  for (const imageGroup of productImages) {
    const productId = productIdBySku.get(imageGroup.sku);
    if (!productId) continue;
    for (const [index, url] of (imageGroup.images ?? []).entries()) {
      productImageRows.push({
        product_id: productId,
        image_url: url,
        alt_text_id: null,
        alt_text_en: null,
        sort_order: index,
        is_primary: index === 0,
        thumbnail_url: url,
        large_url: url,
      });
    }
  }

  const variantRows = variants.map((variant) => ({
    product_id: productIdBySku.get(variant.product_sku),
    color_name: variant.color_name,
    color_hex: variant.color_hex,
    image_url: variant.image_url || null,
    stock: variant.stock,
    sort_order: variant.sort_order,
    price_idr: variant.price_idr,
    original_price_idr: variant.original_price_idr,
    sale_price_idr: variant.sale_price_idr,
  })).filter((row) => row.product_id);

  await insertInChunks(client, "product_categories", productCategoryRows, 300);
  await insertInChunks(client, "product_images", productImageRows, 300);
  await insertInChunks(client, "product_variants", variantRows, 300);

  const existingRedirects = await fetchAllRedirects(client);
  const importedRedirectSlugs = new Set(redirects.map((item) => item.old_slug));
  const staleRedirectSlugs = existingRedirects
    .map((row) => row.old_slug)
    .filter((oldSlug) => !importedRedirectSlugs.has(oldSlug));
  await deleteRedirects(client, staleRedirectSlugs, 300);

  const redirectRows = redirects
    .map((redirect) => ({
      old_slug: redirect.old_slug,
      target_product_id: productIdBySku.get(redirect.target_sku),
      target_slug: redirect.target_slug,
    }))
    .filter((row) => row.target_product_id && row.old_slug !== row.target_slug);

  await upsertInChunks(client, "product_slug_redirects", redirectRows, 300, { onConflict: "old_slug" });

  const allProducts = await fetchAllProducts(client);
  const importedSkuSet = new Set(importedSkus);
  const staleProductIds = allProducts
    .filter((row) => !importedSkuSet.has(row.sku))
    .map((row) => row.id);
  await deleteByIds(client, "products", staleProductIds, 150);

  const { data: finalCounts, error: finalCountsError } = await client
    .from("products")
    .select("id, sku, images, price_idr, is_active", { count: "exact" });
  if (finalCountsError) throw new Error(`Final verification failed: ${finalCountsError.message}`);

  const zeroPrice = (finalCounts ?? []).filter((row) => (row.price_idr ?? 0) <= 0).length;
  const noImages = (finalCounts ?? []).filter((row) => !Array.isArray(row.images) || row.images.length === 0).length;
  console.log(
    JSON.stringify(
      {
        imported_products: importedSkus.length,
        imported_product_images: productImageRows.length,
        imported_variants: variantRows.length,
        imported_redirects: redirectRows.length,
        deleted_stale_products: staleProductIds.length,
        zero_price_products: zeroPrice,
        products_without_images: noImages,
        total_products_after_import: finalCounts?.length ?? 0,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
