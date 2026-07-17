import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { runProductAdvisorSearch, type AdvisorTurn } from "@/lib/product-search.functions";

const BodySchema = z.object({
  question: z.string().min(1).max(1000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .max(12)
    .optional(),
  lang: z.enum(["id", "en"]).optional(),
  limit: z.number().int().min(1).max(10).optional(),
});

export const Route = createFileRoute("/api/public/search/products")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const json = await request.json();
          const body = BodySchema.parse(json);
          const result = await runProductAdvisorSearch({
            question: body.question,
            history: (body.history ?? []) as AdvisorTurn[],
            lang: body.lang ?? "id",
            limit: body.limit ?? 5,
          });

          return Response.json(result, {
            headers: {
              "Cache-Control": "no-store",
            },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return Response.json(
            {
              error: message,
            },
            { status: 400 },
          );
        }
      },
    },
  },
});
