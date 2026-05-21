import { defineConfig }  from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tsConfigPaths     from "vite-tsconfig-paths";

// Use VERCEL=1 (auto-set on Vercel builds) to switch the build target.
const target = process.env.VERCEL ? "vercel" : "node-server";

export default defineConfig({
  plugins: [tanstackStart({ target }), tsConfigPaths()],
});
