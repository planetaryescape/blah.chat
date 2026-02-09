import fs from "node:fs";
import path from "node:path";

type Manifest = Record<string, string>;

function die(msg: string): never {
  // eslint-disable-next-line no-console
  console.error(msg);
  process.exit(1);
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function getArgValue(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  const val = process.argv[idx + 1];
  if (!val || val.startsWith("-")) return null;
  return val;
}

function resolveFromRepoRoot(p: string): string {
  return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
}

function rewriteWorkspaceRange(
  range: string,
  depName: string,
  manifest: Manifest,
): string {
  if (!range.startsWith("workspace:")) return range;

  const spec = range.slice("workspace:".length);
  const pinned = spec === "*" || spec === "^" || spec === "~";
  if (!pinned) return spec; // workspace:1.2.3 or workspace:^1.2.3

  // Find version by matching manifest entry whose package.json has this name.
  // We avoid scanning the whole repo by assuming @blah-chat/* uses matching path key.
  // Primary: infer path from name for @blah-chat/<component>
  const m = depName.match(/^@blah-chat\/(.+)$/);
  if (m) {
    const guessedPath = `packages/${m[1]}`;
    const v = manifest[guessedPath];
    if (v) return `^${v}`;
  }

  // Fallback: exact path keys that look like packages/* and map to depName via package.json
  // (kept small: only check packages paths in manifest)
  for (const manifestPath of Object.keys(manifest)) {
    if (!manifestPath.startsWith("packages/")) continue;
    const pkgJsonPath = resolveFromRepoRoot(
      path.join(manifestPath, "package.json"),
    );
    if (!fs.existsSync(pkgJsonPath)) continue;
    const pkg = readJson<{ name?: string }>(pkgJsonPath);
    if (pkg.name === depName) return `^${manifest[manifestPath]}`;
  }

  die(
    `prepare-npm-publish: cannot resolve workspace range for ${depName}. Add it to .release-please-manifest.json.`,
  );
}

function rewriteDeps(
  deps: Record<string, string> | undefined,
  manifest: Manifest,
): Record<string, string> | undefined {
  if (!deps) return deps;
  const out: Record<string, string> = {};
  for (const [dep, range] of Object.entries(deps)) {
    out[dep] = rewriteWorkspaceRange(range, dep, manifest);
  }
  return out;
}

const pkgDirArg = getArgValue("--package");
if (!pkgDirArg) {
  die(
    "Usage: bun run scripts/prepare-npm-publish.ts --package packages/<name>",
  );
}

const pkgDir = resolveFromRepoRoot(pkgDirArg);
const pkgJsonPath = path.join(pkgDir, "package.json");
if (!fs.existsSync(pkgJsonPath)) die(`Missing ${pkgJsonPath}`);

const manifestPath = resolveFromRepoRoot(".release-please-manifest.json");
if (!fs.existsSync(manifestPath)) die(`Missing ${manifestPath}`);
const manifest = readJson<Manifest>(manifestPath);

const pkg = readJson<any>(pkgJsonPath);
pkg.dependencies = rewriteDeps(pkg.dependencies, manifest);
pkg.devDependencies = rewriteDeps(pkg.devDependencies, manifest);
pkg.peerDependencies = rewriteDeps(pkg.peerDependencies, manifest);

writeJson(pkgJsonPath, pkg);

// eslint-disable-next-line no-console
console.log(
  `prepare-npm-publish: rewritten workspace deps in ${path.relative(process.cwd(), pkgJsonPath)}`,
);
