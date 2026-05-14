import {
  createNeonDatabase,
  memoryEmbeddings,
  type PersistenceDb,
} from "@blah-chat/persistence-postgres";
import { and, isNotNull, sql } from "drizzle-orm";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export async function markExpiredMemories(
  deps: { db?: PersistenceDb; now?: number } = {},
) {
  const db = deps.db ?? createNeonDatabase(getDatabaseUrl());
  const now = deps.now ?? Date.now();
  const cutoff = now - NINETY_DAYS_MS;

  const deleted = await db
    .delete(memoryEmbeddings)
    .where(
      and(
        isNotNull(memoryEmbeddings.metadata),
        sql`(${memoryEmbeddings.metadata}->>'expiresAt')::bigint < ${cutoff}`,
      ),
    )
    .returning();

  return { deleted: deleted.length };
}
