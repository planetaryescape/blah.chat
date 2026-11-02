import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type VersionSource = {
  label: string;
  version: string;
};

function readJsonVersion(path: string, label: string): VersionSource {
  const raw = readFileSync(path, "utf8");
  const parsed = JSON.parse(raw) as { version?: string };
  if (!parsed.version || typeof parsed.version !== "string") {
    throw new Error(`${label} missing string version at ${path}`);
  }
  return { label, version: parsed.version };
}

function readCargoPackageVersion(path: string): VersionSource {
  const raw = readFileSync(path, "utf8");
  const packageStart = raw.indexOf("[package]");
  if (packageStart === -1) {
    throw new Error(`missing [package] section in ${path}`);
  }

  const afterPackage = raw.slice(packageStart);
  const nextSectionStart = afterPackage.slice(1).search(/\n\[/);
  const packageBlock =
    nextSectionStart === -1
      ? afterPackage
      : afterPackage.slice(0, nextSectionStart + 1);

  const version = packageBlock.match(/^\s*version\s*=\s*"([^"]+)"\s*$/m)?.[1];
  if (!version) {
    throw new Error(`missing package version in ${path}`);
  }

  return { label: "apps/desktop/src-tauri/Cargo.toml", version };
}

function main() {
  const root = process.cwd();
  const sources: VersionSource[] = [
    readJsonVersion(
      resolve(root, "apps/desktop/package.json"),
      "apps/desktop/package.json",
    ),
    readJsonVersion(
      resolve(root, "apps/desktop/src-tauri/tauri.conf.json"),
      "apps/desktop/src-tauri/tauri.conf.json",
    ),
    readCargoPackageVersion(resolve(root, "apps/desktop/src-tauri/Cargo.toml")),
  ];

  const expected = sources[0]?.version;
  const drift = sources.filter((entry) => entry.version !== expected);

  if (drift.length > 0) {
    const details = sources.map((entry) => `${entry.label}: ${entry.version}`);
    throw new Error(
      [
        "desktop versions out of sync",
        ...details,
        "Fix: align version in apps/desktop/package.json, apps/desktop/src-tauri/tauri.conf.json, apps/desktop/src-tauri/Cargo.toml",
      ].join("\n"),
    );
  }

  console.log(`desktop versions in sync: ${expected}`);
}

main();
