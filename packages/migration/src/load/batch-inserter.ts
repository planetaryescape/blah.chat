import type { PgTable } from "drizzle-orm/pg-core";

export interface BatchInsertOptions {
  batchSize?: number;
}

export interface BatchInsertResult {
  inserted: number;
  skipped: number;
}

/**
 * Insert rows into a Postgres table in batches using ON CONFLICT DO NOTHING
 * for idempotent re-runs. Falls back to row-by-row on FK violations.
 */
export async function batchInsert(
  // biome-ignore lint/suspicious/noExplicitAny: drizzle db type is complex
  db: any,
  table: PgTable,
  // biome-ignore lint/suspicious/noExplicitAny: row shapes vary per table
  rows: any[],
  options?: BatchInsertOptions,
): Promise<BatchInsertResult> {
  if (rows.length === 0) return { inserted: 0, skipped: 0 };

  const batchSize = options?.batchSize ?? 500;
  let totalInserted = 0;
  let totalSkipped = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    try {
      await db.insert(table).values(batch).onConflictDoNothing();
      totalInserted += batch.length;
    } catch {
      // Batch failed (likely FK violation) — fall back to row-by-row
      for (const row of batch) {
        try {
          await db.insert(table).values([row]).onConflictDoNothing();
          totalInserted++;
        } catch {
          totalSkipped++;
        }
      }
    }
  }

  return { inserted: totalInserted, skipped: totalSkipped };
}
