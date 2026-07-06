import { defineConfig } from "vite";

// Relative base so the build can be served from any subpath
// (e.g. apps.charliekrug.com/circuitle) without absolute-path rewrites.
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
  },
});
