import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.tsx"],
  format: ["esm"],
  external: ["@opentui/core"],
  banner: {
    // Inject FORCE_COLOR before any imports to enable chalk colors
    // Required for marked-terminal ANSI output
    js: 'process.env.FORCE_COLOR = "3";',
  },
});
