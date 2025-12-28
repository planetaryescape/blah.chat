const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

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

module.exports = config;
