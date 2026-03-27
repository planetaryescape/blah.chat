import fs from "node:fs";
import readline from "node:readline";
import AdmZip from "adm-zip";

/**
 * Read all documents from a JSONL file. Skips empty and malformed lines.
 */
export async function readJsonl<T = Record<string, unknown>>(
  filePath: string,
): Promise<T[]> {
  const docs: T[] = [];
  const stream = fs.createReadStream(filePath, { encoding: "utf-8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let lineNumber = 0;
  for await (const line of rl) {
    lineNumber++;
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      docs.push(JSON.parse(trimmed) as T);
    } catch {
      console.warn(
        `[reader] Skipping malformed JSON at line ${lineNumber}: ${trimmed.slice(0, 80)}...`,
      );
    }
  }

  return docs;
}

/**
 * Read documents for a specific table from a Convex export (ZIP or directory).
 *
 * Supports:
 * - Unzipped directory: `{dir}/{tableName}/documents.jsonl` (preferred for large exports)
 * - ZIP flat: `{tableName}.jsonl` (test fixtures)
 * - ZIP directory: `{tableName}/documents.jsonl` (real Convex export in ZIP)
 */
export async function readTableFromZip<T = Record<string, unknown>>(
  inputPath: string,
  tableName: string,
): Promise<T[]> {
  // If inputPath is a directory, read from filesystem directly
  if (fs.existsSync(inputPath) && fs.statSync(inputPath).isDirectory()) {
    const filePath = `${inputPath}/${tableName}/documents.jsonl`;
    if (!fs.existsSync(filePath)) return [];
    return readJsonl<T>(filePath);
  }

  // Otherwise treat as ZIP
  const zip = new AdmZip(inputPath);

  // Try directory format first (real Convex export)
  let entry = zip.getEntry(`${tableName}/documents.jsonl`);
  // Fall back to flat format (test fixtures)
  if (!entry) entry = zip.getEntry(`${tableName}.jsonl`);
  if (!entry) return [];

  const content = entry.getData().toString("utf-8");
  const docs: T[] = [];

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      docs.push(JSON.parse(trimmed) as T);
    } catch {
      console.warn(
        `[reader] Skipping malformed JSON in ${tableName}: ${trimmed.slice(0, 80)}...`,
      );
    }
  }

  return docs;
}

/**
 * List all table names available in a Convex export ZIP.
 *
 * Supports both flat (`{name}.jsonl`) and directory (`{name}/documents.jsonl`) formats.
 */
export function listTablesInZip(zipPath: string): string[] {
  const zip = new AdmZip(zipPath);
  const tables = new Set<string>();

  for (const entry of zip.getEntries()) {
    // Directory format: tableName/documents.jsonl
    const dirMatch = entry.entryName.match(/^([^/]+)\/documents\.jsonl$/);
    if (dirMatch && !dirMatch[1].startsWith("_")) {
      tables.add(dirMatch[1]);
      continue;
    }
    // Flat format: tableName.jsonl
    if (entry.entryName.endsWith(".jsonl") && !entry.entryName.includes("/")) {
      tables.add(entry.entryName.replace(/\.jsonl$/, ""));
    }
  }

  return [...tables];
}
