#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

try {
  execFileSync("git", ["rev-parse", "--is-inside-work-tree"], {
    stdio: "ignore",
  });
} catch {
  // Not in a git work tree (e.g. installed as a tarball dependency). Nothing to do.
  process.exit(0);
}

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const lefthookBin = join(
  repoRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "lefthook.cmd" : "lefthook",
);

if (!existsSync(lefthookBin)) {
  // node_modules not installed yet (rare — prepare runs after install). Skip silently.
  process.exit(0);
}

try {
  execFileSync(lefthookBin, ["install"], { stdio: "inherit" });
} catch (err) {
  console.warn("[prepare] lefthook install skipped:", err?.message ?? err);
}
