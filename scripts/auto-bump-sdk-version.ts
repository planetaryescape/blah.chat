import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const runGit = (gitArgs: string[]): string =>
  execFileSync("git", gitArgs, {
    encoding: "utf8",
  }).trim();

const tryRunGit = (gitArgs: string[]): string | null => {
  try {
    return execFileSync("git", gitArgs, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
};

const stagedSdkFiles = runGit([
  "diff",
  "--name-only",
  "--cached",
  "--",
  "packages/sdk",
])
  .split("\n")
  .map((file) => file.trim())
  .filter(Boolean);

if (stagedSdkFiles.length === 0) {
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

const requiresBump = stagedSdkFiles.some((file) =>
  requiresBumpPrefixes.some((prefix) => file.startsWith(prefix)),
);
const docsOnly = stagedSdkFiles.every((file) =>
  docsOnlyPrefixes.some((prefix) => file.startsWith(prefix)),
);

if (!requiresBump || docsOnly) {
  process.exit(0);
}

const getVersion = (packageJsonRaw: string): string | null => {
  try {
    const parsed = JSON.parse(packageJsonRaw) as { version?: string };
    return parsed.version ?? null;
  } catch {
    return null;
  }
};

const headPackageJsonRaw = tryRunGit([
  "show",
  "HEAD:packages/sdk/package.json",
]);
if (!headPackageJsonRaw) {
  process.exit(0);
}

const indexPackageJsonRaw = tryRunGit(["show", ":packages/sdk/package.json"]);
if (!indexPackageJsonRaw) {
  process.exit(0);
}

const headVersion = getVersion(headPackageJsonRaw);
const indexVersion = getVersion(indexPackageJsonRaw);

if (!headVersion || !indexVersion) {
  console.error("Unable to determine SDK version for auto-bump.");
  process.exit(1);
}

if (indexVersion !== headVersion) {
  process.exit(0);
}

const versionMatch = indexVersion.match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
if (!versionMatch) {
  console.error(
    `Unable to auto-bump SDK version "${indexVersion}". Use semver x.y.z format.`,
  );
  process.exit(1);
}

const nextVersion = `${versionMatch[1]}.${versionMatch[2]}.${Number(versionMatch[3]) + 1}`;

const sdkPkgPath = resolve(process.cwd(), "packages/sdk/package.json");
const packageJson = JSON.parse(readFileSync(sdkPkgPath, "utf8")) as {
  version?: string;
};
packageJson.version = nextVersion;
writeFileSync(sdkPkgPath, `${JSON.stringify(packageJson, null, 2)}\n`);
runGit(["add", "packages/sdk/package.json"]);

console.log(`Auto-bumped SDK version: ${indexVersion} -> ${nextVersion}`);
