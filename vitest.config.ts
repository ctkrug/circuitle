import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      // board.ts/game.ts/main.ts are DOM/canvas glue verified by driving the
      // running app, not unit tests — see docs/ARCHITECTURE.md. types.ts is
      // pure type declarations with no runtime code to cover.
      exclude: ["src/board.ts", "src/game.ts", "src/main.ts", "src/types.ts"],
    },
  },
});
