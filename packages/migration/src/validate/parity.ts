import { sql } from "drizzle-orm";
import { readTableFromZip } from "../extract/reader";

export interface ParityCheckResult {
  table: string;
  convexCount: number;
  pgCount: number;
  match: boolean;
}

export interface ParityReport {
  results: ParityCheckResult[];
  passed: number;
  failed: number;
}

const TABLE_MAP: Record<string, string> = {
  users: "users",
  conversations: "conversations",
  messages: "messages",
  attachments: "attachments",
  templates: "templates",
  projects: "projects",
  bookmarks: "bookmarks",
  notes: "notes",
  tasks: "tasks",
  usageRecords: "usage_records",
  feedback: "feedback_entries",
  ttsCache: "tts_cache",
  shares: "shares",
};

/**
 * Compare row counts between Convex export and Postgres tables.
 */
export async function checkParity(
  // biome-ignore lint/suspicious/noExplicitAny: drizzle db type
  db: any,
  inputZip: string,
  tables?: string[],
): Promise<ParityReport> {
  const tablesToCheck = tables ?? Object.keys(TABLE_MAP);
  const results: ParityCheckResult[] = [];

  for (const convexTable of tablesToCheck) {
    const pgTable = TABLE_MAP[convexTable];
    if (!pgTable) continue;

    const docs = await readTableFromZip(inputZip, convexTable);
    const convexCount = docs.length;

    let pgCount = 0;
    try {
      const rows = await db.execute(
        sql.raw(`SELECT COUNT(*)::int as count FROM ${pgTable}`),
      );
      pgCount = rows.rows?.[0]?.count ?? rows[0]?.count ?? 0;
    } catch {
      pgCount = -1; // Table might not exist
    }

    results.push({
      table: convexTable,
      convexCount,
      pgCount,
      match: convexCount === pgCount,
    });
  }

  return {
    results,
    passed: results.filter((r) => r.match).length,
    failed: results.filter((r) => !r.match).length,
  };
}
