import { createWriteStream, existsSync, readFileSync } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

export function fileExists(path: string): boolean {
  return existsSync(path);
}

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export async function writeJsonAtomic(
  path: string,
  data: unknown,
): Promise<void> {
  await ensureDir(dirname(path));
  const tmp = `${path}.tmp.${Date.now()}`;
  await writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await rename(tmp, path);
}

export function appendJsonl(path: string, row: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const stream = createWriteStream(path, { flags: "a" });
    stream.on("error", reject);
    stream.end(`${JSON.stringify(row)}\n`, "utf8", (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
