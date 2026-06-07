// Vercel serverless entry — delegates to the TanStack Start SSR handler
// built into dist/server/server.js by `npm run build`.
import server from "../dist/server/server.js";

export default async function handler(req) {
  // Vercel's Node.js runtime passes a plain-object headers (IncomingMessage),
  // not a Headers instance. Normalise so .get() is always available.
  const headers =
    req.headers && typeof req.headers.get === "function"
      ? req.headers
      : new Headers(req.headers ?? {});

  // Vercel passes a relative URL ("/"); srvx requires an absolute URL.
  const host = headers.get("host") ?? "localhost";
  const url = new URL(req.url, `https://${host}`);

  return server.fetch(
    new Request(url, {
      method: req.method,
      headers,
      body: req.body,
      duplex: "half",
    }),
  );
}
