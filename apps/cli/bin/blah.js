#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

const __dirname = dirname(fileURLToPath(import.meta.url));

function getPlatformPackageName() {
  const platform = process.platform;
  const arch = process.arch;

  // Map Node.js platform/arch to our package naming
  // Note: Package names use human-friendly "windows", while npm's os field uses "win32"
  const platformMap = {
    darwin: "darwin",
    linux: "linux",
    win32: "windows",
  };

  const archMap = {
    arm64: "arm64",
    x64: "x64",
  };

  const os = platformMap[platform];
  const cpu = archMap[arch];

  if (!os || !cpu) {
    console.error(`Unsupported platform: ${platform}-${arch}`);
    console.error(
      "Supported platforms: darwin-arm64, darwin-x64, linux-x64, linux-arm64, windows-x64",
    );
    process.exit(1);
  }

  return `@blah-chat/cli-${os}-${cpu}`;
}

function findBinaryPath() {
  const packageName = getPlatformPackageName();
  // Split "@blah-chat/cli-darwin-arm64" into ["@blah-chat", "cli-darwin-arm64"]
  const packageParts = packageName.split("/");
  const unscopedName = packageParts[1];

  // Try to find the platform-specific package
  const possiblePaths = [
    // Installed as a dependency (nested node_modules)
    join(__dirname, "..", "node_modules", ...packageParts, "blah"),
    join(__dirname, "..", "node_modules", ...packageParts, "blah.exe"),
    // Sibling under same scope (global npm, workspaces)
    // __dirname = node_modules/@blah-chat/cli/bin/
    // target = node_modules/@blah-chat/cli-darwin-arm64/blah
    join(__dirname, "..", "..", unscopedName, "blah"),
    join(__dirname, "..", "..", unscopedName, "blah.exe"),
    // Root node_modules with full scoped name
    join(__dirname, "..", "..", "..", "node_modules", ...packageParts, "blah"),
    join(
      __dirname,
      "..",
      "..",
      "..",
      "node_modules",
      ...packageParts,
      "blah.exe",
    ),
  ];

  for (const binaryPath of possiblePaths) {
    if (existsSync(binaryPath)) {
      return binaryPath;
    }
  }

  // Try requiring the package to get its path
  try {
    const packagePath = require.resolve(`${packageName}/package.json`);
    const packageDir = dirname(packagePath);
    const binaryName = process.platform === "win32" ? "blah.exe" : "blah";
    const binaryPath = join(packageDir, binaryName);
    if (existsSync(binaryPath)) {
      return binaryPath;
    }
  } catch {
    // Package not found
  }

  return null;
}

function main() {
  const binaryPath = findBinaryPath();

  if (!binaryPath) {
    const packageName = getPlatformPackageName();
    console.error(`Could not find blah binary for your platform.`);
    console.error(`Expected package: ${packageName}`);
    console.error("");
    console.error(
      "This usually means the platform-specific package failed to install.",
    );
    console.error("Try reinstalling:");
    console.error("  npm uninstall -g @blah-chat/cli");
    console.error("  npm install -g @blah-chat/cli");
    process.exit(1);
  }

  // Spawn the binary with all arguments
  const result = spawnSync(binaryPath, process.argv.slice(2), {
    stdio: "inherit",
    env: process.env,
  });

  if (result.error) {
    console.error(`Failed to execute blah: ${result.error.message}`);
    process.exit(1);
  }

  process.exit(result.status ?? 0);
}

main();
