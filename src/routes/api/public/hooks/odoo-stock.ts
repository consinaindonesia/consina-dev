import { createFileRoute } from "@tanstack/react-router";
import {
  assertOdooWebhookAuthorized,
  parseOdooInventoryPayload,
  processOdooInventoryPayload,
} from "@/lib/odoo-inventory";

export const Route = createFileRoute("/api/public/hooks/odoo-stock")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          assertOdooWebhookAuthorized(request);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unauthorized webhook";
          const status = error instanceof Error && error.name === "UnauthorizedWebhookError"
            ? 401
            : 500;
          return Response.json({ ok: false, error: message }, { status });
        }

        try {
          const payload = await parseOdooInventoryPayload(request);
          const result = await processOdooInventoryPayload(payload);
          const status = result.summary.failed > 0 && result.summary.applied === 0 ? 422 : 200;
          return Response.json(result, { status });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Failed to process Odoo inventory webhook";
          return Response.json({ ok: false, error: message }, { status: 400 });
        }
      },
    },
  },
});
