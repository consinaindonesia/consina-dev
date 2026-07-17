import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { indexAdvisorProducts } from "@/lib/product-search.functions";

const BodySchema = z.object({
  force: z.boolean().optional(),
  ids: z.array(z.string().uuid()).max(100).optional(),
});

function isAuthorized(request: Request) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const apikey = request.headers.get("apikey");
  const expected = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(expected && (bearer === expected || apikey === expected));
}

export const Route = createFileRoute("/api/public/search/reindex")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthorized(request)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        try {
          const body = BodySchema.parse(await request.json().catch(() => ({})));
          const result = await indexAdvisorProducts({
            force: body.force ?? false,
            ids: body.ids,
          });
          return Response.json(result, {
            headers: {
              "Cache-Control": "no-store",
            },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return Response.json({ error: message }, { status: 400 });
        }
      },
    },
  },
});
