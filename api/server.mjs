// Vercel Edge entry — delegates to the TanStack Start SSR handler
// built into dist/server/index.js by `npm run build`.
// The build output is a Web-standard fetch handler (Cloudflare Workers
// compatible). Vercel's Edge runtime uses the same Web Request/Response
// API, so we run there. The Node serverless runtime would pass a Node
// IncomingMessage and hang (FUNCTION_INVOCATION_TIMEOUT).
import server from "../dist/server/index.js";

export const config = {
  runtime: "edge",
};

export default async function handler(request) {
  return server.fetch(request);
}
