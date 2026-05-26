import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FIELDS = ["name", "short_description", "description"] as const;
type Field = (typeof FIELDS)[number];

const BulkInput = z.object({
  productIds: z.array(z.string().uuid()).min(1).max(100),
  targetLang: z.enum(["id", "en"]),
});

const LANG_NAME = { id: "Indonesian", en: "English" } as const;

function colFor(field: Field, lang: "id" | "en") {
  return `${field}_${lang}` as const;
}

type GlossaryRow = {
  term_en: string;
  term_id: string | null;
  never_translate: boolean;
  notes: string | null;
};

function buildGlossaryBlock(rows: GlossaryRow[], target: "id" | "en") {
  if (!rows.length) return "";
  const lines = rows.map((g) => {
    if (g.never_translate) {
      return `- "${g.term_en}" — preserve exactly, do not translate${g.notes ? ` (${g.notes})` : ""}`;
    }
    if (target === "id" && g.term_id) {
      return `- "${g.term_en}" → translate to "${g.term_id}" in Indonesian`;
    }
    if (target === "en" && g.term_id) {
      return `- "${g.term_id}" → translate to "${g.term_en}" in English`;
    }
    return `- "${g.term_en}"${g.notes ? ` (${g.notes})` : ""}`;
  });
  return `Brand glossary — apply these rules strictly:\n${lines.join("\n")}`;
}

async function callClaude(apiKey: string, system: string, user: string) {
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
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Translate failed (${res.status}): ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  return (json.content ?? [])
    .filter((c) => c.type === "text")
    .map((c) => c.text ?? "")
    .join("")
    .trim();
}

export const bulkTranslateProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => BulkInput.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

    const { supabase, claims } = context;
    const email = (claims as { email?: string }).email;
    if (!email) throw new Error("Unauthorized");

    const { data: admin } = await supabase
      .from("admin_users")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (!admin?.id) throw new Error("Admin profile not found");

    const target = data.targetLang;
    const source = target === "id" ? "en" : "id";

    // Fetch brand glossary to guide the translator
    const { data: glossary } = await supabase
      .from("brand_glossary")
      .select("term_en, term_id, never_translate, notes");
    const glossaryBlock = buildGlossaryBlock(
      (glossary ?? []) as Array<{
        term_en: string;
        term_id: string | null;
        never_translate: boolean;
        notes: string | null;
      }>,
      target,
    );

    const { data: products, error } = await supabase
      .from("products")
      .select(
        "id, name_id, name_en, short_description_id, short_description_en, description_id, description_en, ai_translated_fields",
      )
      .in("id", data.productIds);
    if (error) throw new Error(error.message);

    let translatedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const p of products ?? []) {
      const row = p as Record<string, string | string[] | null>;
      const updates: Record<string, string> = {};
      const newFlags = new Set(
        Array.isArray(row.ai_translated_fields) ? row.ai_translated_fields : [],
      );
      let didAny = false;

      for (const field of FIELDS) {
        const srcCol = colFor(field, source);
        const tgtCol = colFor(field, target);
        const srcVal = (row[srcCol] as string | null) ?? "";
        const tgtVal = (row[tgtCol] as string | null) ?? "";
        if (!srcVal.trim()) continue;
        if (tgtVal.trim()) continue;

        try {
          const system = `You translate product content for Consina, an Indonesian outdoor lifestyle brand.
Source language: ${LANG_NAME[source]}
Target language: ${LANG_NAME[target]}
Content type: ${field}

${glossaryBlock}

Rules:
- Preserve brand tone: adventurous, grounded, community-oriented.
- Keep technical specs precise (e.g. '60L', 'water-resistant').
- Do not translate proper names (Consina, place / mountain names).
- For names: keep concise and brand-consistent.
- For descriptions: preserve HTML formatting.

Provide ONLY the translation, no commentary.`;
          const out = await callClaude(apiKey, system, `Source text:\n${srcVal}`);
          if (out) {
            updates[tgtCol] = out;
            newFlags.add(tgtCol);
            didAny = true;
          }
        } catch (e) {
          errors.push(`${p.id}/${field}: ${(e as Error).message}`);
        }
      }

      if (didAny) {
        const { error: upErr } = await supabase
          .from("products")
          .update({
            ...updates,
            ai_translated_fields: Array.from(newFlags),
          })
          .eq("id", p.id);
        if (upErr) {
          errors.push(`${p.id}: ${upErr.message}`);
        } else {
          translatedCount += 1;
          await supabase.from("activity_log").insert({
            admin_user_id: admin.id,
            action: "ai_translation",
            entity_type: "product",
            entity_id: p.id,
          });
        }
      } else {
        skippedCount += 1;
      }
    }

    return { translatedCount, skippedCount, errors };
  });

const ApproveInput = z.object({
  productId: z.string().uuid(),
  fields: z.array(z.string()).optional(),
});

export const approveTranslations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ApproveInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("products")
      .select("ai_translated_fields")
      .eq("id", data.productId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const current: string[] = Array.isArray(row?.ai_translated_fields)
      ? (row!.ai_translated_fields as string[])
      : [];
    const next = data.fields && data.fields.length > 0
      ? current.filter((f) => !data.fields!.includes(f))
      : [];
    const { error: upErr } = await supabase
      .from("products")
      .update({ ai_translated_fields: next })
      .eq("id", data.productId);
    if (upErr) throw new Error(upErr.message);
    return { ok: true, remaining: next };
  });