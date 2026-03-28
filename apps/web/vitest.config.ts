import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    setupFiles: ["./src/lib/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", "e2e", ".next"],
    css: false, // Don't process CSS imports
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      exclude: [
        "node_modules",
        "e2e",
        ".next",
        "**/*.d.ts",
        "**/*.config.*",
        "**/types/**",
      ],
    },
  },
  resolve: {
    alias: {
      // Order matters: more specific aliases first
      "@blah-chat/persistence-postgres": path.resolve(
        __dirname,
        "../../packages/persistence-postgres/src/index.ts",
      ),
      "@blah-chat/chat-ui-core": path.resolve(
        __dirname,
        "../../packages/chat-ui-core/src/index.ts",
      ),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
