import {
  conversations,
  createNeonDatabase,
  type PersistenceDb,
} from "@blah-chat/persistence-postgres";
import { schedules } from "@trigger.dev/sdk";
import { and, eq, sql } from "drizzle-orm";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export const CLEANUP_STALE_INCOGNITO_CRON = {
  pattern: "30 * * * *",
  timezone: "UTC",
  environments: ["PRODUCTION"] as Array<"PRODUCTION">,
};

export async function cleanupStaleIncognito(
  deps: { db?: PersistenceDb; now?: number } = {},
) {
  const db = deps.db ?? createNeonDatabase(getDatabaseUrl());
  const now = deps.now ?? Date.now();
  const cutoff = now - TWENTY_FOUR_HOURS_MS;

  const deleted = await db
    .delete(conversations)
    .where(
      and(
        eq(conversations.isIncognito, true),
        sql`(${conversations.incognitoSettings}->>'lastActivityAt')::bigint < ${cutoff}`,
      ),
    )
    .returning();

  return { deleted: deleted.length };
}

export const cleanupStaleIncognitoTask = schedules.task({
  id: "cleanup-stale-incognito",
  cron: CLEANUP_STALE_INCOGNITO_CRON,
  maxDuration: 120,
  retry: { maxAttempts: 1 },
  run: async () => cleanupStaleIncognito(),
});
