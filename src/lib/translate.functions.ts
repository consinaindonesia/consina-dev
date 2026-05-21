import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  from: z.enum(["id", "en"]),
  to: z.enum(["id", "en"]),
  name: z.string().max(500).optional().default(""),
  short: z.string().max(500).optional().default(""),
  full: z.string().max(20000).optional().default(""),
});

export const translateProductFields = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const fromLang = data.from === "id" ? "Indonesian" : "English";
    const toLang = data.to === "id" ? "Indonesian" : "English";

    const system = `You are a professional product copywriter translating outdoor gear product copy from ${fromLang} to ${toLang}. Preserve product names where appropriate, keep tone confident and concise. Preserve HTML tags in the full description exactly (only translate text inside tags). Return JSON only.`;

    const user = `Translate the following product fields from ${fromLang} to ${toLang}.

NAME: ${data.name || "(empty)"}
SHORT_DESCRIPTION: ${data.short || "(empty)"}
FULL_DESCRIPTION (HTML): ${data.full || "(empty)"}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_translation",
              description: "Return the translated fields",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  short: { type: "string" },
                  full: { type: "string" },
                },
                required: ["name", "short", "full"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_translation" } },
      }),
    });

    if (res.status === 429) throw new Error("Rate limit exceeded — please try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Translation failed: ${res.status} ${t.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{
        message?: {
          tool_calls?: Array<{ function?: { arguments?: string } }>;
        };
      }>;
    };
    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("No translation returned");
    const parsed = JSON.parse(args) as { name: string; short: string; full: string };
    return parsed;
  });