import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { localizedCategoryName, localizedProductName } from "@/i18n/format";

export type AdvisorTurn = {
  role: "user" | "assistant";
  content: string;
};

export type AdvisorProduct = {
  id: string;
  sku: string;
  slug: string | null;
  name_en: string;
  name_id: string;
  category_slug: string | null;
  category_name_en: string | null;
  category_name_id: string | null;
  short_description_en: string | null;
  short_description_id: string | null;
  description_en: string | null;
  description_id: string | null;
  price_idr: number;
  original_price_idr: number | null;
  sale_price_idr: number | null;
  stock: number;
  stock_status: string;
  is_on_sale: boolean;
  is_featured: boolean;
  attributes: unknown;
  image_url: string | null;
  similarity?: number | null;
};

export type ProductSearchResult = {
  advice: string;
  products: AdvisorProduct[];
  searchQuery: string;
  engine: "semantic" | "keyword";
  reranked: boolean;
  vectorReady: boolean;
};

const DEFAULT_GROQ_MODEL = process.env.GROQ_CHAT_MODEL || "llama-3.1-8b-instant";
const DEFAULT_COHERE_EMBED_MODEL = process.env.COHERE_EMBED_MODEL || "embed-v4.0";
const DEFAULT_COHERE_RERANK_MODEL = process.env.COHERE_RERANK_MODEL || "rerank-v3.5";

function getCohereApiKey() {
  return process.env.COHERE_API_KEY || process.env.cohere_api_key;
}

type SearchIntent = {
  categoryTerms: string[];
  corporate: boolean;
  stockFocused: boolean;
};

function compactText(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(". ");
}

function normalizeSearchText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function productDisplayName(product: AdvisorProduct, lang: "id" | "en") {
  return localizedProductName(product, lang) || product.name_en || product.name_id;
}

function productCategoryName(product: AdvisorProduct, lang: "id" | "en") {
  return localizedCategoryName(
    {
      slug: product.category_slug,
      name_id: product.category_name_id ?? "",
      name_en: product.category_name_en ?? product.category_name_id ?? "",
    },
    lang,
  );
}

function productDescription(product: AdvisorProduct, lang: "id" | "en") {
  return (
    (lang === "id" ? product.short_description_id : product.short_description_en) ||
    (lang === "id" ? product.description_id : product.description_en) ||
    product.short_description_en ||
    product.short_description_id ||
    product.description_en ||
    product.description_id ||
    ""
  );
}

function buildProductSearchDocument(product: AdvisorProduct) {
  return compactText([
    product.name_en,
    product.name_id,
    productCategoryName(product, "en"),
    productCategoryName(product, "id"),
    product.short_description_en,
    product.short_description_id,
    product.description_en,
    product.description_id,
    product.sku,
    JSON.stringify(product.attributes ?? {}),
  ]);
}

function normalizeLooseText(value: string | null | undefined) {
  return normalizeSearchText(value).replace(/\s+/g, " ").trim();
}

function detectSearchIntent(question: string): SearchIntent {
  const q = normalizeLooseText(question);
  const hasAny = (...parts: string[]) => parts.some((part) => q.includes(part));

  const categoryTerms: string[] = [];
  if (hasAny("carrier", "carriers", "tas carrier", "ransel gunung", "backpack carrier")) categoryTerms.push("carriers");
  if (hasAny("tenda", "tent", "camping tent")) categoryTerms.push("tents");
  if (hasAny("sepatu", "sandal", "footwear", "trail shoes", "trail shoe")) categoryTerms.push("footwear");
  if (hasAny("jaket", "kemeja", "celana", "apparel", "shirt", "shirts", "jacket", "pants")) categoryTerms.push("apparel");
  if (hasAny("lampu", "botol", "trekking pole", "headlamp", "aksesoris", "accessories")) categoryTerms.push("accessories");
  if (hasAny("tas laptop", "travel bag", "waist bag", "drybag", "duffle", "duffel")) categoryTerms.push("bags");

  return {
    categoryTerms,
    corporate: hasAny("corporate", "seragam", "uniform", "kemeja", "pcs", "piece", "pieces", "bulk", "wholesale"),
    stockFocused: hasAny("stok", "stock", "ready", "available", "availability", "tersedia"),
  };
}

function productCategoryPool(product: AdvisorProduct) {
  return normalizeLooseText(
    [
      product.category_slug,
      product.category_name_en,
      product.category_name_id,
      product.name_en,
      product.name_id,
      product.short_description_en,
      product.short_description_id,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function productIntentScore(product: AdvisorProduct, intent: SearchIntent) {
  const categoryPool = productCategoryPool(product);
  let score = 0;

  if (intent.categoryTerms.length > 0) {
    const matchedCategory = intent.categoryTerms.some((term) => categoryPool.includes(term.replace(/-/g, " ")));
    if (matchedCategory) score += 240;
    else score -= 180;
  }

  if (intent.corporate) {
    const apparelLike =
      categoryPool.includes("apparel") ||
      categoryPool.includes("kemeja") ||
      categoryPool.includes("shirt") ||
      categoryPool.includes("jaket");
    if (apparelLike) score += 120;
    else score -= 80;
  }

  if (intent.stockFocused || intent.corporate) {
    score += Math.min(product.stock, 100);
    if (product.stock <= 0 || product.stock_status !== "in_stock") score -= 120;
  }

  return score;
}

function rerankProductsByIntent(products: AdvisorProduct[], question: string) {
  const intent = detectSearchIntent(question);

  return products
    .map((product, index) => ({
      product,
      index,
      score:
        Number(product.similarity ?? 0) * 100 +
        productIntentScore(product, intent) +
        (product.is_featured ? 6 : 0),
    }))
    .filter((entry) => entry.score > -120)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.product);
}

function formatProductForPrompt(product: AdvisorProduct, lang: "id" | "en") {
  return [
    `[#${product.id}] ${productDisplayName(product, lang)}`,
    productCategoryName(product, lang) ? `Category: ${productCategoryName(product, lang)}` : "",
    productDescription(product, lang),
    `Price IDR: ${product.price_idr}`,
    product.sale_price_idr ? `Sale price IDR: ${product.sale_price_idr}` : "",
    `Stock status: ${product.stock_status}`,
    `Attributes: ${JSON.stringify(product.attributes ?? {})}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function cohereEmbed(text: string, inputType: "search_document" | "search_query") {
  const key = getCohereApiKey();
  if (!key) throw new Error("COHERE_API_KEY is not configured");

  const res = await fetch("https://api.cohere.com/v2/embed", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: DEFAULT_COHERE_EMBED_MODEL,
      input_type: inputType,
      embedding_types: ["float"],
      inputs: [{ content: [{ type: "text", text }] }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Cohere embed failed (${res.status}): ${detail.slice(0, 240)}`);
  }

  const json = (await res.json()) as {
    embeddings?: { float?: number[][] };
  };
  const vector = json.embeddings?.float?.[0];
  if (!vector) throw new Error("Cohere embed returned no vector");
  return vector;
}

async function cohereRerank(query: string, documents: string[], topN: number) {
  const key = getCohereApiKey();
  if (!key) return null;

  const res = await fetch("https://api.cohere.com/v2/rerank", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: DEFAULT_COHERE_RERANK_MODEL,
      query,
      documents,
      top_n: topN,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Cohere rerank failed (${res.status}): ${detail.slice(0, 240)}`);
  }

  const json = (await res.json()) as {
    results?: Array<{ index: number; relevance_score: number }>;
  };
  return json.results ?? [];
}

async function groqChat(messages: AdvisorTurn[] | Array<{ role: "system" | "user" | "assistant"; content: string }>, maxTokens = 800) {
  const key = process.env.GROQ_API_KEY;
  if (!key) return "";

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: DEFAULT_GROQ_MODEL,
      messages,
      temperature: 0.3,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Groq chat failed (${res.status}): ${detail.slice(0, 240)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

async function condenseSearchQuery(history: AdvisorTurn[], latest: string) {
  if (history.length === 0 || !process.env.GROQ_API_KEY) return latest.trim();

  try {
    const condensed = await groqChat(
      [
        {
          role: "system",
          content:
            "Rewrite the user's latest message into one standalone product-search query. " +
            "Fold in relevant context from the conversation. Output only the query.",
        },
        ...history,
        { role: "user", content: latest },
      ],
      80,
    );

    return condensed || latest.trim();
  } catch {
    return latest.trim();
  }
}

async function hasAdvisorEmbeddings() {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id")
    .not("advisor_embedding" as never, "is", null)
    .limit(1);

  if (error) return false;
  return (data?.length ?? 0) > 0;
}

async function fetchKeywordCandidates(question: string, limit: number) {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select(
      "id, sku, slug, name_en, name_id, short_description_en, short_description_id, description_en, description_id, price_idr, original_price_idr, sale_price_idr, stock, stock_status, is_on_sale, is_featured, attributes, images, categories!products_category_id_fkey(slug,name_en,name_id), product_images(image_url,is_primary,sort_order)",
    )
    .eq("is_active", true)
    .limit(250);

  if (error) throw new Error(`Failed to load keyword candidates: ${error.message}`);

  const tokens = question
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/[^\p{L}\p{N}-]/gu, ""))
    .filter(Boolean);
  const intent = detectSearchIntent(question);

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const scored = rows
    .map((row) => {
      const primaryImage = Array.isArray(row.product_images)
        ? [...(row.product_images as Array<Record<string, unknown>>)]
            .sort(
              (a, b) =>
                Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary)) ||
                Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0),
            )[0]
        : null;

      const product: AdvisorProduct = {
        id: String(row.id),
        sku: String(row.sku),
        slug: (row.slug as string | null) ?? null,
        name_en: String(row.name_en ?? ""),
        name_id: String(row.name_id ?? ""),
        category_slug: ((row.categories as { slug?: string } | null)?.slug ?? null) as string | null,
        category_name_en: ((row.categories as { name_en?: string } | null)?.name_en ?? null) as string | null,
        category_name_id: ((row.categories as { name_id?: string } | null)?.name_id ?? null) as string | null,
        short_description_en: (row.short_description_en as string | null) ?? null,
        short_description_id: (row.short_description_id as string | null) ?? null,
        description_en: (row.description_en as string | null) ?? null,
        description_id: (row.description_id as string | null) ?? null,
        price_idr: Number(row.price_idr ?? 0),
        original_price_idr: (row.original_price_idr as number | null) ?? null,
        sale_price_idr: (row.sale_price_idr as number | null) ?? null,
        stock: Number(row.stock ?? 0),
        stock_status: String(row.stock_status ?? "in_stock"),
        is_on_sale: Boolean(row.is_on_sale),
        is_featured: Boolean(row.is_featured),
        attributes: row.attributes ?? {},
        image_url: (primaryImage?.image_url as string | undefined) ?? ((row.images as string[] | null)?.[0] ?? null),
      };

      const haystack = buildProductSearchDocument(product).toLowerCase();
      let score = 0;
      for (const token of tokens) {
        if (haystack.includes(token)) score += 1;
      }
      score += productIntentScore(product, intent);
      if (product.is_featured) score += 0.25;
      return { product, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.product);

  return scored;
}

async function fetchSemanticCandidates(searchQuery: string, candidateCount: number, threshold: number) {
  const queryEmbedding = await cohereEmbed(searchQuery, "search_query");
  const { data, error } = await supabaseAdmin.rpc("match_products_for_advisor", {
    query_embedding: queryEmbedding,
    match_count: candidateCount,
    match_threshold: threshold,
  });
  if (error) throw new Error(`Vector match failed: ${error.message}`);
  return (data ?? []) as AdvisorProduct[];
}

function buildFallbackAdvice(products: AdvisorProduct[], lang: "id" | "en") {
  if (products.length === 0) {
    return lang === "id"
      ? "Saya belum menemukan produk yang cukup cocok. Coba jelaskan kebutuhan Anda lebih spesifik, misalnya kategori, kapasitas, budget, atau kondisi penggunaan."
      : "I couldn't find a strong product match yet. Try being more specific about category, capacity, budget, or how you'll use it.";
  }

  const lines = products.slice(0, 3).map((product, index) => {
    const name = productDisplayName(product, lang);
    const category = productCategoryName(product, lang);
    const reason = productDescription(product, lang) || JSON.stringify(product.attributes ?? {});
    if (lang === "id") {
      return `${index + 1}. ${name}${category ? ` (${category})` : ""} — harga Rp ${product.price_idr.toLocaleString("id-ID")}. ${reason}`;
    }
    return `${index + 1}. ${name}${category ? ` (${category})` : ""} — price IDR ${product.price_idr}. ${reason}`;
  });

  return (lang === "id"
    ? "Berikut kandidat produk yang paling relevan berdasarkan data katalog Consina:\n"
    : "Here are the most relevant product candidates from the Consina catalog:\n") + lines.join("\n");
}

function buildCorporateAdvice(products: AdvisorProduct[], lang: "id" | "en") {
  if (products.length === 0) {
    return lang === "id"
      ? "Saya belum menemukan produk apparel yang siap untuk order corporate. Coba sebutkan jenisnya lebih spesifik, misalnya kemeja, jaket, atau kaos, lalu saya cek stok yang paling mendekati."
      : "I couldn't find an apparel product ready for a corporate order yet. Try specifying whether you need shirts, jackets, or tees so I can check the closest available stock.";
  }

  const lines = products.slice(0, 3).map((product, index) => {
    const name = productDisplayName(product, lang);
    const stock = product.stock;
    return lang === "id"
      ? `${index + 1}. ${name} — stok ready ${stock} pcs, harga Rp ${product.price_idr.toLocaleString("id-ID")}.`
      : `${index + 1}. ${name} — ready stock ${stock} pcs, price IDR ${product.price_idr}.`;
  });

  return lang === "id"
    ? `Untuk kebutuhan corporate, saya prioritaskan produk dengan stok paling siap saat ini:\n${lines.join("\n")}\nJika target quantity Anda lebih besar dari stok ready, saya sarankan lanjut ke tim sales/corporate untuk split warna atau batch restock.`
    : `For corporate needs, I'm prioritizing products with the strongest ready stock right now:\n${lines.join("\n")}\nIf your target quantity is larger than the ready stock, the next step is to continue with the sales/corporate team for color splits or restock batches.`;
}

export async function runProductAdvisorSearch({
  question,
  history,
  lang,
  limit,
}: {
  question: string;
  history: AdvisorTurn[];
  lang: "id" | "en";
  limit: number;
}): Promise<ProductSearchResult> {
  const cleanQuestion = question.trim();
  const searchQuery = await condenseSearchQuery(history.slice(-6), cleanQuestion);
  const intent = detectSearchIntent(searchQuery || cleanQuestion);
  const vectorReady = await hasAdvisorEmbeddings();

  let engine: "semantic" | "keyword" = "keyword";
  let reranked = false;
  let products: AdvisorProduct[] = [];

  if (vectorReady && getCohereApiKey()) {
    try {
      engine = "semantic";
      products = await fetchSemanticCandidates(searchQuery, Math.max(limit * 4, 12), 0.15);

      if (products.length > 1) {
        const rerankedResults = await cohereRerank(
          searchQuery,
          products.map(buildProductSearchDocument),
          Math.min(limit, 5),
        );
        if (rerankedResults.length > 0) {
          reranked = true;
          products = rerankedResults
            .map((result) => products[result.index])
            .filter(Boolean);
        }
      }

      products = rerankProductsByIntent(products, cleanQuestion).slice(0, limit);
    } catch {
      engine = "keyword";
      reranked = false;
      products = await fetchKeywordCandidates(searchQuery, limit);
    }
  } else {
    products = await fetchKeywordCandidates(searchQuery, limit);
  }

  let advice = intent.corporate ? buildCorporateAdvice(products, lang) : buildFallbackAdvice(products, lang);
  if (process.env.GROQ_API_KEY && products.length > 0) {
    const groundedContext = products
      .map((product) => formatProductForPrompt(product, lang))
      .join("\n\n");
    const system =
      (lang === "id"
        ? "Anda adalah customer service AI Consina. Rekomendasikan HANYA dari daftar produk di bawah. Jangan pernah mengarang produk, harga, kategori, atau spesifikasi. Jika user menyebut kategori tertentu seperti carrier, sepatu, tenda, atau corporate apparel, JANGAN rekomendasikan kategori lain. Jika tidak ada yang cocok, katakan dengan jujur. Untuk pertanyaan corporate atau stok, fokus pada stok siap jual dan arahkan follow-up bila quantity belum cukup. Referensikan produk dengan [#id]. Jawab natural, ringkas, dan seperti customer service yang membantu.\n\nPRODUK TERSEDIA:\n"
        : "You are Consina's AI customer service assistant. Recommend ONLY from the products below. Never invent products, prices, categories, or specs. If the user asks for a specific category like carrier, footwear, tents, or corporate apparel, DO NOT recommend a different category. If nothing fits, say so honestly. For corporate or stock questions, focus on ready stock and suggest a follow-up when quantity is not enough. Reference products by [#id]. Reply naturally, concisely, and like a helpful customer service agent.\n\nAVAILABLE PRODUCTS:\n") +
      groundedContext;

    try {
      const response = await groqChat([
        { role: "system", content: system },
        ...history.slice(-6),
        { role: "user", content: cleanQuestion },
      ]);
      if (response) advice = response;
    } catch {
      // Keep grounded fallback advice if the chat model is unavailable.
    }
  }

  return {
    advice,
    products,
    searchQuery,
    engine,
    reranked,
    vectorReady,
  };
}

export async function indexAdvisorProducts({
  force = false,
  ids,
}: {
  force?: boolean;
  ids?: string[];
}) {
  const query = supabaseAdmin
    .from("products")
    .select(
      "id, sku, name_en, name_id, short_description_en, short_description_id, description_en, description_id, attributes, categories!products_category_id_fkey(slug,name_en,name_id)",
    )
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (!force) query.is("advisor_embedding" as never, null);
  if (ids && ids.length > 0) query.in("id", ids);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load products for indexing: ${error.message}`);

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  if (rows.length === 0) return { indexed: 0 };

  let indexed = 0;
  for (const row of rows) {
    const text = compactText([
      row.name_en as string | null,
      row.name_id as string | null,
      (row.categories as { name_en?: string } | null)?.name_en ?? null,
      (row.categories as { name_id?: string } | null)?.name_id ?? null,
      row.short_description_en as string | null,
      row.short_description_id as string | null,
      row.description_en as string | null,
      row.description_id as string | null,
      row.sku as string | null,
      JSON.stringify(row.attributes ?? {}),
    ]);

    const vector = await cohereEmbed(text, "search_document");
    const { error: updateError } = await supabaseAdmin
      .from("products")
      .update({ advisor_embedding: vector } as never)
      .eq("id", row.id as string);

    if (updateError) {
      throw new Error(`Failed to store embedding for product ${String(row.id)}: ${updateError.message}`);
    }
    indexed += 1;
  }

  return { indexed };
}
