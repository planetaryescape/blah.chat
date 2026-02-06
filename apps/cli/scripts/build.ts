import solidPlugin from "@opentui/solid/bun-plugin";

await Bun.build({
  entrypoints: ["./src/index.tsx"],
  outdir: "./dist",
  target: "node",
  format: "esm",
  external: ["@opentui/core", "tree-sitter-wasms"],
  minify: true,
  conditions: ["browser"],
  plugins: [solidPlugin],
  banner: 'process.env.FORCE_COLOR = "3";',
});

console.log("CLI built successfully");
