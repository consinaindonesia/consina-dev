// Vercel serverless entry — delegates to the TanStack Start SSR handler.
import server from "../dist/server/server.js";

export default async function handler(req) {
  return server.fetch(req);
}

export const config = { runtime: "nodejs20.x" };
