import { createReadStream } from "node:fs";
import * as readline from "node:readline";

export async function readJsonl<T>(path: string): Promise<T[]> {
  const input = createReadStream(path, { encoding: "utf8" });
  const rl = readline.createInterface({ input, crlfDelay: Infinity });
  const out: T[] = [];
  for await (const line of rl) {
    const s = line.trim();
    if (!s) continue;
    out.push(JSON.parse(s) as T);
  }
  return out;
}
