import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import solidPlugin from "@opentui/solid/bun-plugin";

const DIST = resolve(import.meta.dirname, "../dist/release");
const ASSETS_DIR = resolve(import.meta.dirname, "../assets/tree-sitter");
const ENTRYPOINT = resolve(import.meta.dirname, "../src/index.tsx");
const WORKSPACE_ROOT = resolve(import.meta.dirname, "../../..");

// @opentui/core uses dynamic imports for platform-specific native binaries.
// Only the current platform's package is installed by default (optionalDependencies).
// For cross-compilation, we need all target platforms' packages available.
const OPENTUI_PLATFORMS = [
  "darwin-arm64",
  "darwin-x64",
  "linux-x64",
  "linux-arm64",
  "win32-x64",
] as const;

async function ensurePlatformPackages() {
  const corePath = dirname(require.resolve("@opentui/core"));
  const coreVersion = JSON.parse(
    readFileSync(join(corePath, "package.json"), "utf8"),
  ).version;
  const missing: string[] = [];

  for (const plat of OPENTUI_PLATFORMS) {
    try {
      require.resolve(`@opentui/core-${plat}`);
    } catch {
      missing.push(`@opentui/core-${plat}@${coreVersion}`);
    }
  }

  if (missing.length > 0) {
    console.log(`Installing missing platform packages: ${missing.join(", ")}`);
    const addProc = Bun.spawnSync(["bun", "add", ...missing], {
      cwd: WORKSPACE_ROOT,
      stdout: "inherit",
      stderr: "inherit",
    });
    if (addProc.exitCode !== 0) {
      console.error("Failed to install platform packages");
      process.exit(1);
    }
    // Run bun install to ensure packages are properly linked for bundling
    console.log("Running bun install to link packages...");
    const installProc = Bun.spawnSync(["bun", "install"], {
      cwd: WORKSPACE_ROOT,
      stdout: "inherit",
      stderr: "inherit",
    });
    if (installProc.exitCode !== 0) {
      console.error("Failed to run bun install");
      process.exit(1);
    }
  }
}

const LANGUAGES = [
  "python",
  "bash",
  "css",
  "json",
  "go",
  "rust",
  "java",
  "html",
  "toml",
  "tsx",
  "c",
  "ruby",
];

type Target = {
  bunTarget: string;
  name: string;
  ext: string;
  archiveType: "tar" | "zip";
};

const ALL_TARGETS: Target[] = [
  {
    bunTarget: "bun-darwin-arm64",
    name: "blah-cli-darwin-arm64",
    ext: "",
    archiveType: "tar",
  },
  {
    bunTarget: "bun-darwin-x64",
    name: "blah-cli-darwin-x64",
    ext: "",
    archiveType: "tar",
  },
  {
    bunTarget: "bun-linux-x64",
    name: "blah-cli-linux-x64",
    ext: "",
    archiveType: "tar",
  },
  {
    bunTarget: "bun-linux-arm64",
    name: "blah-cli-linux-arm64",
    ext: "",
    archiveType: "tar",
  },
  {
    bunTarget: "bun-windows-x64",
    name: "blah-cli-windows-x64",
    ext: ".exe",
    archiveType: "zip",
  },
];

function currentTarget(): Target {
  const platform =
    process.platform === "darwin"
      ? "darwin"
      : process.platform === "win32"
        ? "windows"
        : "linux";
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  return ALL_TARGETS.find((t) => t.bunTarget === `bun-${platform}-${arch}`)!;
}

const singleMode = process.argv.includes("--single");
const targets = singleMode ? [currentTarget()] : ALL_TARGETS;

if (!singleMode) await ensurePlatformPackages();

if (existsSync(DIST)) rmSync(DIST, { recursive: true });
mkdirSync(DIST, { recursive: true });

for (const target of targets) {
  const dir = join(DIST, target.name);
  const outfile = join(dir, `blah${target.ext}`);

  console.log(`Building ${target.name}...`);
  mkdirSync(dir, { recursive: true });

  const result = await Bun.build({
    entrypoints: [ENTRYPOINT],
    compile: {
      target: target.bunTarget as any,
      outfile,
    },
    minify: true,
    conditions: ["browser"],
    plugins: [solidPlugin],
    banner: 'process.env.FORCE_COLOR = "3";',
  });

  if (!result.success) {
    console.error(`Build failed for ${target.name}:`, result.logs);
    process.exit(1);
  }

  // Copy tree-sitter highlight .scm files
  const highlightsOut = join(dir, "assets", "tree-sitter");
  cpSync(ASSETS_DIR, highlightsOut, { recursive: true });

  // Copy tree-sitter wasm files (not embeddable by Bun compiler)
  const wasmOut = join(dir, "assets", "tree-sitter-wasms");
  mkdirSync(wasmOut, { recursive: true });
  for (const lang of LANGUAGES) {
    const src = require.resolve(
      `tree-sitter-wasms/out/tree-sitter-${lang}.wasm`,
    );
    copyFileSync(src, join(wasmOut, `tree-sitter-${lang}.wasm`));
  }

  // Copy tree-sitter worker file (Web Workers can't be bundled into Bun binary)
  const workerSrc = require.resolve("@opentui/core/parser.worker.js");
  copyFileSync(workerSrc, join(dir, "assets", "parser.worker.js"));

  // Create archive
  if (target.archiveType === "tar") {
    const archive = `${target.name}.tar.gz`;
    const proc = Bun.spawnSync(["tar", "-czf", archive, target.name], {
      cwd: DIST,
    });
    if (proc.exitCode !== 0) {
      console.error(`Failed to create ${archive}:`, proc.stderr.toString());
      process.exit(1);
    }
  } else {
    const archive = `${target.name}.zip`;
    // Windows doesn't have zip, use PowerShell's Compress-Archive
    const isWindows = process.platform === "win32";
    const proc = isWindows
      ? Bun.spawnSync(
          [
            "powershell",
            "-Command",
            `Compress-Archive -Path '${target.name}' -DestinationPath '${archive}'`,
          ],
          { cwd: DIST },
        )
      : Bun.spawnSync(["zip", "-r", archive, target.name], { cwd: DIST });
    if (proc.exitCode !== 0) {
      console.error(`Failed to create ${archive}:`, proc.stderr.toString());
      process.exit(1);
    }
  }

  rmSync(dir, { recursive: true });
  console.log(`  ${target.name} done`);
}

console.log("\nAll builds complete. Archives in dist/release/");
