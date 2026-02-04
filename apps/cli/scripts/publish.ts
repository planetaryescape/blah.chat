#!/usr/bin/env bun

/**
 * npm publish automation for @blah-chat/cli
 *
 * This script:
 * 1. Downloads pre-built binaries from GitHub release
 * 2. Creates platform-specific npm packages (@blah-chat/cli-{platform}-{arch})
 * 3. Creates the main wrapper package (@blah-chat/cli)
 * 4. Publishes all packages to npm
 *
 * Usage:
 *   bun run scripts/publish.ts --version <version> [--dry-run] [--tag <tag>]
 *
 * Options:
 *   --version  Version to publish (e.g., 1.0.0, without v prefix)
 *   --dry-run  Preview what would be published without actually publishing
 *   --tag      npm dist-tag (default: latest)
 */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

const REPO = "planetaryescape/blah.chat";
const SCOPE = "@blah-chat";
const DIST = resolve(import.meta.dirname, "../dist/npm");

interface Platform {
  name: string; // e.g., darwin-arm64
  archiveName: string; // e.g., blah-cli-darwin-arm64
  archiveExt: string; // tar.gz or zip
  binaryName: string; // blah or blah.exe
  os: string; // darwin, linux, win32
  cpu: string; // arm64, x64
}

const PLATFORMS: Platform[] = [
  {
    name: "darwin-arm64",
    archiveName: "blah-cli-darwin-arm64",
    archiveExt: "tar.gz",
    binaryName: "blah",
    os: "darwin",
    cpu: "arm64",
  },
  {
    name: "darwin-x64",
    archiveName: "blah-cli-darwin-x64",
    archiveExt: "tar.gz",
    binaryName: "blah",
    os: "darwin",
    cpu: "x64",
  },
  {
    name: "linux-x64",
    archiveName: "blah-cli-linux-x64",
    archiveExt: "tar.gz",
    binaryName: "blah",
    os: "linux",
    cpu: "x64",
  },
  {
    name: "linux-arm64",
    archiveName: "blah-cli-linux-arm64",
    archiveExt: "tar.gz",
    binaryName: "blah",
    os: "linux",
    cpu: "arm64",
  },
  {
    name: "windows-x64",
    archiveName: "blah-cli-windows-x64",
    archiveExt: "zip",
    binaryName: "blah.exe",
    os: "win32",
    cpu: "x64",
  },
];

function parseArgs(): { version: string; dryRun: boolean; tag: string } {
  const args = process.argv.slice(2);
  let version = "";
  let dryRun = false;
  let tag = "latest";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--version" && args[i + 1]) {
      version = args[i + 1].replace(/^v/, "");
      i++;
    } else if (args[i] === "--dry-run") {
      dryRun = true;
    } else if (args[i] === "--tag" && args[i + 1]) {
      tag = args[i + 1];
      i++;
    }
  }

  if (!version) {
    console.error("Usage: bun run scripts/publish.ts --version <version>");
    console.error("Example: bun run scripts/publish.ts --version 1.0.0");
    process.exit(1);
  }

  return { version, dryRun, tag };
}

async function downloadBinary(
  platform: Platform,
  version: string,
  destDir: string,
): Promise<void> {
  const url = `https://github.com/${REPO}/releases/download/v${version}/${platform.archiveName}.${platform.archiveExt}`;
  const archivePath = join(
    destDir,
    `${platform.archiveName}.${platform.archiveExt}`,
  );

  console.log(`  Downloading ${platform.name}...`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to download ${url}: ${response.status} ${response.statusText}`,
    );
  }

  const buffer = await response.arrayBuffer();
  writeFileSync(archivePath, Buffer.from(buffer));

  // Extract
  if (platform.archiveExt === "tar.gz") {
    const proc = Bun.spawnSync(["tar", "-xzf", archivePath], { cwd: destDir });
    if (proc.exitCode !== 0) {
      throw new Error(`Failed to extract ${archivePath}`);
    }
  } else {
    const proc = Bun.spawnSync(["unzip", "-q", archivePath], { cwd: destDir });
    if (proc.exitCode !== 0) {
      throw new Error(`Failed to extract ${archivePath}`);
    }
  }

  // Clean up archive
  rmSync(archivePath);
}

function createPlatformPackage(
  platform: Platform,
  version: string,
  downloadDir: string,
): string {
  const packageName = `cli-${platform.name}`;
  const packageDir = join(DIST, packageName);
  mkdirSync(packageDir, { recursive: true });

  // Copy binary
  const binaryPath = join(
    downloadDir,
    platform.archiveName,
    platform.binaryName,
  );
  if (!existsSync(binaryPath)) {
    throw new Error(`Binary not found: ${binaryPath}`);
  }
  copyFileSync(binaryPath, join(packageDir, platform.binaryName));

  // Copy assets if present
  const assetsPath = join(downloadDir, platform.archiveName, "assets");
  if (existsSync(assetsPath)) {
    Bun.spawnSync(["cp", "-r", assetsPath, packageDir]);
  }

  // Create package.json
  const packageJson = {
    name: `${SCOPE}/${packageName}`,
    version,
    description: `blah.chat CLI binary for ${platform.name}`,
    license: "MIT",
    repository: {
      type: "git",
      url: `git+https://github.com/${REPO}.git`,
      directory: "apps/cli",
    },
    homepage: "https://blah.chat",
    os: [platform.os],
    cpu: [platform.cpu],
    files: [platform.binaryName, "assets"],
  };

  writeFileSync(
    join(packageDir, "package.json"),
    JSON.stringify(packageJson, null, 2),
  );

  return packageDir;
}

function createMainPackage(version: string): string {
  const packageDir = join(DIST, "cli");
  mkdirSync(packageDir, { recursive: true });

  // Copy bin/blah.js
  const binDir = join(packageDir, "bin");
  mkdirSync(binDir, { recursive: true });
  const srcBin = resolve(import.meta.dirname, "../bin/blah.js");
  copyFileSync(srcBin, join(binDir, "blah.js"));

  // Copy scripts/postinstall.mjs
  const scriptsDir = join(packageDir, "scripts");
  mkdirSync(scriptsDir, { recursive: true });
  const srcPostinstall = resolve(import.meta.dirname, "postinstall.mjs");
  copyFileSync(srcPostinstall, join(scriptsDir, "postinstall.mjs"));

  // Build optionalDependencies
  const optionalDependencies: Record<string, string> = {};
  for (const platform of PLATFORMS) {
    optionalDependencies[`${SCOPE}/cli-${platform.name}`] = version;
  }

  // Create package.json
  const packageJson = {
    name: `${SCOPE}/cli`,
    version,
    description: "blah.chat CLI - AI chat assistant with multi-model support",
    license: "MIT",
    repository: {
      type: "git",
      url: `git+https://github.com/${REPO}.git`,
      directory: "apps/cli",
    },
    homepage: "https://blah.chat",
    keywords: [
      "ai",
      "chat",
      "cli",
      "openai",
      "anthropic",
      "claude",
      "gpt",
      "gemini",
    ],
    bin: {
      blah: "./bin/blah.js",
    },
    type: "module",
    scripts: {
      postinstall: "node scripts/postinstall.mjs",
    },
    files: ["bin", "scripts"],
    optionalDependencies,
    engines: {
      node: ">=18",
    },
  };

  writeFileSync(
    join(packageDir, "package.json"),
    JSON.stringify(packageJson, null, 2),
  );

  // Create README
  const readme = `# @blah-chat/cli

AI chat assistant CLI with access to multiple models (OpenAI, Anthropic, Google, and more).

## Installation

\`\`\`bash
npm install -g @blah-chat/cli
\`\`\`

Or use the shell installer:

\`\`\`bash
curl -fsSL https://blah.chat/install | bash
\`\`\`

## Usage

\`\`\`bash
blah --help
\`\`\`

## Links

- Website: https://blah.chat
- GitHub: https://github.com/${REPO}
`;

  writeFileSync(join(packageDir, "README.md"), readme);

  return packageDir;
}

async function publishPackage(
  packageDir: string,
  dryRun: boolean,
  tag: string,
): Promise<void> {
  const packageJson = JSON.parse(
    readFileSync(join(packageDir, "package.json"), "utf8"),
  );

  if (dryRun) {
    console.log(`  Would publish ${packageJson.name}@${packageJson.version}`);
    // List files that would be published
    const _proc = Bun.spawnSync(["npm", "pack", "--dry-run"], {
      cwd: packageDir,
      stdout: "inherit",
      stderr: "inherit",
    });
    return;
  }

  console.log(`  Publishing ${packageJson.name}@${packageJson.version}...`);

  const proc = Bun.spawnSync(
    ["npm", "publish", "--access", "public", "--tag", tag],
    {
      cwd: packageDir,
      stdout: "inherit",
      stderr: "inherit",
    },
  );

  if (proc.exitCode !== 0) {
    throw new Error(`Failed to publish ${packageJson.name}`);
  }
}

async function main() {
  const { version, dryRun, tag } = parseArgs();

  console.log(
    `\nPublishing @blah-chat/cli v${version}${dryRun ? " (dry run)" : ""}\n`,
  );

  // Clean dist
  if (existsSync(DIST)) {
    rmSync(DIST, { recursive: true });
  }
  mkdirSync(DIST, { recursive: true });

  // Download directory
  const downloadDir = join(DIST, "_downloads");
  mkdirSync(downloadDir);

  // Download all binaries
  console.log("Downloading binaries...");
  for (const platform of PLATFORMS) {
    await downloadBinary(platform, version, downloadDir);
  }

  // Create platform packages
  console.log("\nCreating platform packages...");
  const platformPackageDirs: string[] = [];
  for (const platform of PLATFORMS) {
    const dir = createPlatformPackage(platform, version, downloadDir);
    platformPackageDirs.push(dir);
    console.log(`  Created ${SCOPE}/cli-${platform.name}`);
  }

  // Create main package
  console.log("\nCreating main package...");
  const mainPackageDir = createMainPackage(version);
  console.log(`  Created ${SCOPE}/cli`);

  // Publish platform packages first
  console.log("\nPublishing platform packages...");
  for (const dir of platformPackageDirs) {
    await publishPackage(dir, dryRun, tag);
  }

  // Publish main package
  console.log("\nPublishing main package...");
  await publishPackage(mainPackageDir, dryRun, tag);

  // Cleanup
  rmSync(downloadDir, { recursive: true });

  console.log(`\n✅ Successfully published @blah-chat/cli v${version}\n`);
}

main().catch((err) => {
  console.error("\n❌ Publish failed:", err.message);
  process.exit(1);
});
