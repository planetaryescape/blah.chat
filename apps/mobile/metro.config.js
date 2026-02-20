const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

// Get default config with correct project root
const config = getDefaultConfig(projectRoot);

// Monorepo support: add workspace packages and root node_modules
config.watchFolders = [monorepoRoot];

// Node modules resolution - check local first, then monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// CRITICAL: Ensure single copy of React in monorepo
// Without this, workspace packages may pull in their own React
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  // Node.js polyfills for Convex WebSocket support
  buffer: require.resolve("buffer"),
  process: require.resolve("process"),
  // Force single React instance
  react: path.resolve(projectRoot, "node_modules/react"),
  "react-native": path.resolve(projectRoot, "node_modules/react-native"),
  "react-dom": path.resolve(projectRoot, "node_modules/react-dom"),
};

// Redirect refractor imports to an empty shim.
// We only use the hljs path (highlight.js) via react-native-code-highlighter.
// refractor (Prism-based) crashes in Metro due to ESM/CJS language registration issues.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "refractor" || moduleName.startsWith("refractor/")) {
    return { type: "empty" };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
