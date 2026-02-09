import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const baseArgIndex = args.indexOf("--base");
const baseRef =
  baseArgIndex >= 0 && args[baseArgIndex + 1]
    ? args[baseArgIndex + 1]
    : "origin/main";

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

const getChangedApiClientFiles = (): string[] => {
  const readDiff = (range: string) =>
    runGit(["diff", "--name-only", range, "--", "packages/api-client"])
      .split("\n")
      .map((file) => file.trim())
      .filter(Boolean);

  try {
    return readDiff(`${baseRef}...HEAD`);
  } catch {
    // In shallow CI clones, merge-base can be missing; fall back to direct range.
    return readDiff(`${baseRef}..HEAD`);
  }
};

const changed = getChangedApiClientFiles();

if (changed.length === 0) {
  console.log(`No API client changes detected vs ${baseRef}.`);
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

const requiresBump = changed.some((file) =>
  requiresBumpPrefixes.some((prefix) => file.startsWith(prefix)),
);
const docsOnly = changed.every((file) =>
  docsOnlyPrefixes.some((prefix) => file.startsWith(prefix)),
);

if (!requiresBump || docsOnly) {
  console.log(
    "API client changes are docs/examples only; version bump not required.",
  );
  process.exit(0);
}

const apiClientPkgPath = resolve(
  process.cwd(),
  "packages/api-client/package.json",
);
const headPackageJson = JSON.parse(readFileSync(apiClientPkgPath, "utf8")) as {
  version?: string;
};
const headVersion = headPackageJson.version;

if (!headVersion) {
  console.error(
    "Unable to determine API client version from head package.json",
  );
  process.exit(1);
}

const basePackageJsonRaw = tryRunGit([
  "show",
  `${baseRef}:packages/api-client/package.json`,
]);
if (!basePackageJsonRaw) {
  console.log(
    `API client package does not exist on ${baseRef}; treating this as initial introduction.`,
  );
  console.log(`API client version present on head: ${headVersion}`);
  process.exit(0);
}

const basePackageJson = JSON.parse(basePackageJsonRaw) as {
  version?: string;
};
const baseVersion = basePackageJson.version;

if (!baseVersion) {
  console.error("Unable to determine API client versions from package.json");
  process.exit(1);
}

if (headVersion === baseVersion) {
  console.error("API client version bump required.");
  console.error(`Base version: ${baseVersion}`);
  console.error(`Head version: ${headVersion}`);
  console.error("Changed files:");
  for (const file of changed) {
    console.error(`- ${file}`);
  }
  console.error(
    "Bump packages/api-client/package.json version when API client runtime/contract changes.",
  );
  process.exit(1);
}

console.log(
  `API client version bump verified: ${baseVersion} -> ${headVersion}`,
);
