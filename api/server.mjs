// Vercel serverless entry — delegates to the TanStack Start SSR handler
// built into dist/server/server.js by `npm run build`.
import server from "../dist/server/index.js";

export default async function handler(req) {
  return server.fetch(req);
}
