import {
  createNeonDatabase,
  memoryEmbeddings,
  type PersistenceDb,
} from "@blah-chat/persistence-postgres";
import { schedules } from "@trigger.dev/sdk";
import { and, isNotNull, sql } from "drizzle-orm";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export const MARK_EXPIRED_MEMORIES_CRON = {
  pattern: "0 3 * * *",
  timezone: "UTC",
  environments: ["PRODUCTION"] as Array<"PRODUCTION">,
};

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

export const markExpiredMemoriesTask = schedules.task({
  id: "mark-expired-memories",
  cron: MARK_EXPIRED_MEMORIES_CRON,
  maxDuration: 120,
  retry: { maxAttempts: 1 },
  run: async () => markExpiredMemories(),
});
