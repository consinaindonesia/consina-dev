// Vercel serverless entry — delegates to the TanStack Start SSR handler
// built into dist/server/server.js by `npm run build`.
import server from "../dist/server/server.js";

export default async function handler(req, res) {
  // Vercel Node.js runtime: req is IncomingMessage, res is ServerResponse.
  // Convert to Web APIs for server.fetch, then write the response back.
  const host = req.headers["host"] ?? "localhost";
  const url = new URL(req.url ?? "/", `https://${host}`);

  const headers = new Headers(
    Object.entries(req.headers).flatMap(([k, v]) =>
      Array.isArray(v) ? v.map((val) => [k, val]) : [[k, String(v)]],
    ),
  );

  const webReq = new Request(url, {
    method: req.method,
    headers,
    body: req.method !== "GET" && req.method !== "HEAD" ? req : undefined,
    duplex: "half",
  });

  const webRes = await server.fetch(webReq);

  res.statusCode = webRes.status;
  for (const [key, value] of webRes.headers.entries()) {
    res.setHeader(key, value);
  }
  res.end(Buffer.from(await webRes.arrayBuffer()));
}
