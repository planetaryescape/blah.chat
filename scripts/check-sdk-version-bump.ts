import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const baseArgIndex = args.findIndex((arg) => arg === "--base");
const baseRef =
  baseArgIndex >= 0 && args[baseArgIndex + 1]
    ? args[baseArgIndex + 1]
    : "origin/main";

const runGit = (gitArgs: string[]): string =>
  execFileSync("git", gitArgs, {
    encoding: "utf8",
  }).trim();

const changed = runGit([
  "diff",
  "--name-only",
  `${baseRef}...HEAD`,
  "--",
  "packages/sdk",
])
  .split("\n")
  .map((file) => file.trim())
  .filter(Boolean);

if (changed.length === 0) {
  console.log(`No SDK changes detected vs ${baseRef}.`);
  process.exit(0);
}

const docsOnlyPrefixes = [
  "packages/sdk/README.md",
  "packages/sdk/CHANGELOG.md",
  "packages/sdk/examples/",
];
const requiresBumpPrefixes = [
  "packages/sdk/src/",
  "packages/sdk/openapi/",
  "packages/sdk/scripts/",
  "packages/sdk/tsconfig.json",
  "packages/sdk/package.json",
];

const requiresBump = changed.some((file) =>
  requiresBumpPrefixes.some((prefix) => file.startsWith(prefix)),
);
const docsOnly = changed.every((file) =>
  docsOnlyPrefixes.some((prefix) => file.startsWith(prefix)),
);

if (!requiresBump || docsOnly) {
  console.log("SDK changes are docs/examples only; version bump not required.");
  process.exit(0);
}

const sdkPkgPath = resolve(process.cwd(), "packages/sdk/package.json");
const headPackageJson = JSON.parse(readFileSync(sdkPkgPath, "utf8")) as {
  version?: string;
};

const basePackageJson = JSON.parse(
  runGit(["show", `${baseRef}:packages/sdk/package.json`]),
) as {
  version?: string;
};

const headVersion = headPackageJson.version;
const baseVersion = basePackageJson.version;

if (!headVersion || !baseVersion) {
  console.error("Unable to determine SDK versions from package.json");
  process.exit(1);
}

if (headVersion === baseVersion) {
  console.error("SDK version bump required.");
  console.error(`Base version: ${baseVersion}`);
  console.error(`Head version: ${headVersion}`);
  console.error("Changed files:");
  for (const file of changed) {
    console.error(`- ${file}`);
  }
  console.error(
    "Bump packages/sdk/package.json version when SDK runtime/contract changes.",
  );
  process.exit(1);
}

console.log(`SDK version bump verified: ${baseVersion} -> ${headVersion}`);
