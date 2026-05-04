#!/usr/bin/env node
import { execFileSync } from "node:child_process";
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

try {
  execFileSync(lefthookBin, ["install"], { stdio: "inherit" });
} catch (err) {
  if (err?.code !== "ENOENT") {
    console.warn("[prepare] lefthook install skipped:", err?.message ?? err);
  }
}
