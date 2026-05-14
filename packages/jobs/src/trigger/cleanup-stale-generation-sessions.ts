import {
  createNeonDatabase,
  generationSessions,
  type PersistenceDb,
} from "@blah-chat/persistence-postgres";
import { and, eq, lt } from "drizzle-orm";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

const STALE_LOCK_TIMEOUT_MS = 60_000;

export async function cleanupStaleGenerationSessions(
  deps: { db?: PersistenceDb; now?: number } = {},
) {
  const db = deps.db ?? createNeonDatabase(getDatabaseUrl());
  const now = deps.now ?? Date.now();
  const cutoff = now - STALE_LOCK_TIMEOUT_MS;

  const result = await db
    .update(generationSessions)
    .set({ status: "failed", updatedAt: now })
    .where(
      and(
        eq(generationSessions.status, "pending"),
        lt(generationSessions.createdAt, cutoff),
      ),
    )
    .returning();

  return { cleaned: result.length };
}
