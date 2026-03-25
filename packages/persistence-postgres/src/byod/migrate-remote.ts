import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import type { PersistenceDb } from "../db";

interface JournalEntry {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
}

interface Journal {
  version: string;
  dialect: string;
  entries: JournalEntry[];
}

export interface MigrationResult {
  index: number;
  tag: string;
  status: "completed" | "failed" | "skipped";
  error?: string;
  durationMs: number;
}

export interface MigrationRunResult {
  applied: MigrationResult[];
  newVersion: number;
}

export interface MigrationDeps {
  readJournal: () => Promise<Journal>;
  readMigrationSql: (tag: string) => Promise<string>;
}

const DRIZZLE_DIR = join(__dirname, "../../drizzle");

function defaultDeps(): MigrationDeps {
  return {
    readJournal: async () => {
      const raw = await readFile(
        join(DRIZZLE_DIR, "meta/_journal.json"),
        "utf-8",
      );
      return JSON.parse(raw) as Journal;
    },
    readMigrationSql: async (tag: string) => {
      return readFile(join(DRIZZLE_DIR, `${tag}.sql`), "utf-8");
    },
  };
}

export async function getTargetSchemaVersion(
  deps: MigrationDeps = defaultDeps(),
): Promise<number> {
  const journal = await deps.readJournal();
  return journal.entries.length;
}

export async function runPendingMigrations(
  targetDb: PersistenceDb,
  fromIndex: number,
  deps: MigrationDeps = defaultDeps(),
): Promise<MigrationRunResult> {
  const journal = await deps.readJournal();
  const pending = journal.entries.filter((e) => e.idx >= fromIndex);
  const applied: MigrationResult[] = [];
  let lastSuccessfulVersion = fromIndex;

  for (const entry of pending) {
    const start = performance.now();
    try {
      const rawSql = await deps.readMigrationSql(entry.tag);

      if (rawSql.trim()) {
        // Split on Drizzle's breakpoint marker and execute each statement
        const statements = rawSql
          .split("--> statement-breakpoint")
          .map((s) => s.trim())
          .filter(Boolean);

        for (const stmt of statements) {
          await targetDb.execute(sql.raw(stmt));
        }
      }

      const durationMs = Math.round(performance.now() - start);
      applied.push({
        index: entry.idx,
        tag: entry.tag,
        status: "completed",
        durationMs,
      });
      lastSuccessfulVersion = entry.idx + 1;
    } catch (err) {
      const durationMs = Math.round(performance.now() - start);
      applied.push({
        index: entry.idx,
        tag: entry.tag,
        status: "failed",
        error: err instanceof Error ? err.message : "Unknown error",
        durationMs,
      });
      // Stop on first failure
      break;
    }
  }

  return {
    applied,
    newVersion: lastSuccessfulVersion,
  };
}
