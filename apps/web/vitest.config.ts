import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/lib/test/setup.ts"],
    include: [
      "src/**/*.test.{ts,tsx}",
      "../../packages/backend/convex/**/*.test.ts",
    ],
    exclude: ["node_modules", "e2e", ".next"],
    css: false, // Don't process CSS imports
    server: {
      deps: {
        inline: ["convex-test"],
      },
    },
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
      "@blah-chat/backend": path.resolve(__dirname, "../../packages/backend"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
