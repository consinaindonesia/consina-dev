// Worker entry placeholder. The TanStack Start Vite plugin generates the
// real SSR handler at build time; this file exists only because
// wrangler.jsonc still references it as `main`.
export default {
  async fetch(): Promise<Response> {
    return new Response("Not Found", { status: 404 });
  },
};
