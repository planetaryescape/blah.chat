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

const stagedApiClientFiles = runGit([
  "diff",
  "--name-only",
  "--cached",
  "--",
  "packages/api-client",
])
  .split("\n")
  .map((file) => file.trim())
  .filter(Boolean);

if (stagedApiClientFiles.length === 0) {
  process.exit(0);
}

const docsOnlyPrefixes = [
  "packages/api-client/README.md",
  "packages/api-client/CHANGELOG.md",
  "packages/api-client/examples/",
];
const requiresBumpPrefixes = [
  "packages/api-client/src/",
  "packages/api-client/openapi/",
  "packages/api-client/scripts/",
  "packages/api-client/tsconfig.json",
  "packages/api-client/package.json",
];

const requiresBump = stagedApiClientFiles.some((file) =>
  requiresBumpPrefixes.some((prefix) => file.startsWith(prefix)),
);
const docsOnly = stagedApiClientFiles.every((file) =>
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
  "HEAD:packages/api-client/package.json",
]);
if (!headPackageJsonRaw) {
  process.exit(0);
}

const indexPackageJsonRaw = tryRunGit([
  "show",
  ":packages/api-client/package.json",
]);
if (!indexPackageJsonRaw) {
  process.exit(0);
}

const headVersion = getVersion(headPackageJsonRaw);
const indexVersion = getVersion(indexPackageJsonRaw);

if (!headVersion || !indexVersion) {
  console.error("Unable to determine API client version for auto-bump.");
  process.exit(1);
}

if (indexVersion !== headVersion) {
  process.exit(0);
}

const versionMatch = indexVersion.match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
if (!versionMatch) {
  console.error(
    `Unable to auto-bump API client version "${indexVersion}". Use semver x.y.z format.`,
  );
  process.exit(1);
}

const nextVersion = `${versionMatch[1]}.${versionMatch[2]}.${Number(versionMatch[3]) + 1}`;

const apiClientPkgPath = resolve(
  process.cwd(),
  "packages/api-client/package.json",
);
const packageJson = JSON.parse(readFileSync(apiClientPkgPath, "utf8")) as {
  version?: string;
};
packageJson.version = nextVersion;
writeFileSync(apiClientPkgPath, `${JSON.stringify(packageJson, null, 2)}\n`);
runGit(["add", "packages/api-client/package.json"]);

console.log(
  `Auto-bumped API client version: ${indexVersion} -> ${nextVersion}`,
);
