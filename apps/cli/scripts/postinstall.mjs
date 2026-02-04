#!/usr/bin/env node

/**
 * Postinstall script for @blah-chat/cli
 * Verifies that the platform-specific binary package was installed correctly.
 */

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PLATFORM_MAP = {
  darwin: "darwin",
  linux: "linux",
  win32: "windows",
};

const ARCH_MAP = {
  arm64: "arm64",
  x64: "x64",
};

function main() {
  const os = PLATFORM_MAP[process.platform];
  const cpu = ARCH_MAP[process.arch];

  if (!os || !cpu) {
    console.warn(
      `\n⚠️  Unsupported platform: ${process.platform}-${process.arch}`,
    );
    console.warn(
      "   Supported platforms: darwin-arm64, darwin-x64, linux-x64, linux-arm64, windows-x64",
    );
    console.warn("   The blah CLI may not work correctly on this platform.\n");
    return;
  }

  const packageName = `@blah-chat/cli-${os}-${cpu}`;

  // Try to find the binary
  const possiblePaths = [
    join(__dirname, "..", "node_modules", packageName, "blah"),
    join(__dirname, "..", "node_modules", packageName, "blah.exe"),
    join(__dirname, "..", "..", packageName, "blah"),
    join(__dirname, "..", "..", packageName, "blah.exe"),
    join(__dirname, "..", "..", "..", packageName, "blah"),
    join(__dirname, "..", "..", "..", packageName, "blah.exe"),
  ];

  let found = false;
  for (const path of possiblePaths) {
    if (existsSync(path)) {
      found = true;
      break;
    }
  }

  // Also try require.resolve
  if (!found) {
    try {
      const packagePath = require.resolve(`${packageName}/package.json`);
      const packageDir = dirname(packagePath);
      const binaryName = process.platform === "win32" ? "blah.exe" : "blah";
      const binaryPath = join(packageDir, binaryName);
      if (existsSync(binaryPath)) {
        found = true;
      }
    } catch {
      // Package not found
    }
  }

  if (!found) {
    console.warn(`\n⚠️  Platform binary package not found: ${packageName}`);
    console.warn("   This may happen if:");
    console.warn("   - Your platform is not supported");
    console.warn("   - The optional dependency failed to download");
    console.warn("");
    console.warn("   Try reinstalling:");
    console.warn("   npm uninstall -g @blah-chat/cli");
    console.warn("   npm install -g @blah-chat/cli\n");
  }
}

main();
