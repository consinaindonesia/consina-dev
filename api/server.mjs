// Vercel serverless entry — delegates to the TanStack Start SSR handler
// built into dist/server/server.js by `npm run build`.
import server from "../dist/server/server.js";

export default async function handler(req) {
  // Vercel passes a Request with a relative URL (e.g. "/"); srvx requires
  // an absolute URL or new URL() throws ERR_INVALID_URL.
  const host = req.headers.get("host") ?? "localhost";
  const url = new URL(req.url, `https://${host}`);
  const absoluteReq = new Request(url, {
    method: req.method,
    headers: req.headers,
    body: req.body,
    duplex: "half",
  });
  return server.fetch(absoluteReq);
}
