import fs from "node:fs";
import path from "node:path";

type ReleasePleaseConfig = {
  packages?: Record<
    string,
    {
      "release-type"?: string;
      component?: string;
      "package-name"?: string;
    }
  >;
};

function die(msg: string): never {
  // eslint-disable-next-line no-console
  console.error(msg);
  process.exit(1);
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function exists(p: string): boolean {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function requireField(pkg: any, field: string, pkgPath: string): void {
  if (pkg[field] === undefined)
    die(`${pkgPath}: missing package.json field: ${field}`);
}

const repoRoot = process.cwd();
const cfgPath = path.join(repoRoot, ".release-please-config.json");
if (!exists(cfgPath)) die("Missing .release-please-config.json");

const cfg = readJson<ReleasePleaseConfig>(cfgPath);
const pkgs = cfg.packages ?? {};

const publishedPackagePaths = Object.keys(pkgs).filter((p) =>
  p.startsWith("packages/"),
);

if (publishedPackagePaths.length === 0) {
  // eslint-disable-next-line no-console
  console.log("check-package-docs: no publishable packages configured");
  process.exit(0);
}

for (const pkgPath of publishedPackagePaths) {
  const abs = path.join(repoRoot, pkgPath);
  const pkgJsonPath = path.join(abs, "package.json");
  const readmePath = path.join(abs, "README.md");

  if (!exists(pkgJsonPath)) die(`${pkgPath}: missing package.json`);
  if (!exists(readmePath)) die(`${pkgPath}: missing README.md`);

  const pkg = readJson<any>(pkgJsonPath);
  requireField(pkg, "name", pkgPath);
  requireField(pkg, "version", pkgPath);

  if (pkg.private === true)
    die(`${pkgPath}: package.json has private:true (must be publishable)`);
  if (pkg.publishConfig?.access !== "public") {
    die(`${pkgPath}: publishConfig.access must be "public"`);
  }

  // If it has a build script, it should publish dist.
  if (pkg.scripts?.build) {
    if (!Array.isArray(pkg.files) || !pkg.files.includes("dist")) {
      die(
        `${pkgPath}: build script present but package.json.files missing "dist"`,
      );
    }
    if (!pkg.main?.startsWith("./dist/"))
      die(`${pkgPath}: main should point to ./dist/*`);
    if (!pkg.types?.startsWith("./dist/"))
      die(`${pkgPath}: types should point to ./dist/*`);
  }
}

// eslint-disable-next-line no-console
console.log(
  `check-package-docs: ok (${publishedPackagePaths.length} packages)`,
);
