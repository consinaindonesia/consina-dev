import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  sourceText: z.string().min(1).max(20000),
  sourceLang: z.enum(["id", "en"]),
  targetLang: z.enum(["id", "en"]),
  contentType: z.enum(["name", "short_description", "description"]),
  productId: z.string().uuid().nullable().optional(),
});

const LANG_NAME = { id: "Indonesian", en: "English" } as const;
const RATE_LIMIT_PER_HOUR = 50;
const DEFAULT_GROQ_MODEL = process.env.GROQ_CHAT_MODEL || "llama-3.1-8b-instant";

function maxTokensFor(text: string) {
  return Math.min(1800, Math.max(300, Math.ceil(text.length / 2.5)));
}

async function callGroqTranslate(system: string, sourceText: string) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return "";

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_GROQ_MODEL,
      temperature: 0.15,
      max_tokens: maxTokensFor(sourceText),
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Source text:\n${sourceText}` },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("Groq translate error", res.status, t.slice(0, 500));
    if (res.status === 401) {
      throw new Error("Groq API key is invalid. Check GROQ_API_KEY.");
    }
    throw new Error(`Groq translation failed (${res.status})`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

async function callAnthropicTranslate(system: string, sourceText: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return "";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 4096,
      system,
      messages: [
        { role: "user", content: `Source text:\n${sourceText}` },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("Anthropic translate error", res.status, t.slice(0, 500));
    if (res.status === 429) {
      throw new Error("Claude rate limit hit — please retry shortly.");
    }
    if (res.status === 401) {
      throw new Error("Anthropic API key is invalid. Check ANTHROPIC_API_KEY.");
    }
    throw new Error(`Anthropic translation failed (${res.status})`);
  }

  const json = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  return (json.content ?? [])
    .filter((c) => c.type === "text")
    .map((c) => c.text ?? "")
    .join("")
    .trim();
}

export const translateText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (!process.env.GROQ_API_KEY && !process.env.ANTHROPIC_API_KEY) {
      throw new Error("GROQ_API_KEY or ANTHROPIC_API_KEY is required for translation");
    }

    const { supabase, claims } = context;
    const email = (claims as { email?: string }).email;
    if (!email) throw new Error("Unauthorized: missing email claim");

    const { data: admin } = await supabase
      .from("admin_users")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    const adminId = admin?.id ?? null;
    if (!adminId) throw new Error("Unauthorized: admin profile not found");

    // Rate limit: 50 translations per admin per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("activity_log")
      .select("id", { count: "exact", head: true })
      .eq("admin_user_id", adminId)
      .eq("action", "ai_translation")
      .gte("created_at", oneHourAgo);
    if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
      throw new Error(
        `Translation limit reached (${RATE_LIMIT_PER_HOUR}/hour). Please try again later.`,
      );
    }

    const system = `You are translating product content for Consina, an Indonesian outdoor lifestyle brand.
Source language: ${LANG_NAME[data.sourceLang]}
Target language: ${LANG_NAME[data.targetLang]}
Content type: ${data.contentType}

Rules:
- Preserve the brand tone: adventurous, grounded, community-oriented
- Keep technical specs precise (e.g., '60L', 'water-resistant', material names)
- Don't translate proper names (Consina, place names, mountain names)
- For product names: keep them concise and brand-consistent
- For descriptions: preserve any HTML formatting
- If the source contains escaped line breaks such as \\n, convert them into natural readable spacing or paragraphs.
- Do not add claims, specs, prices, sizes, or stock information that are not in the source.

Provide ONLY the translation, no explanations.`;

    const translation =
      (await callGroqTranslate(system, data.sourceText)) ||
      (await callAnthropicTranslate(system, data.sourceText));
    if (!translation) throw new Error("No translation returned");

    // Log to activity_log (best-effort but awaited so failures surface in logs)
    const { error: logError } = await supabase.from("activity_log").insert({
      admin_user_id: adminId,
      action: "ai_translation",
      entity_type: "product",
      entity_id: data.productId ?? null,
    });
    if (logError) console.error("activity_log insert failed", logError);

    return { translation };
  });
