import {
  conversations,
  createNeonDatabase,
  type PersistenceDb,
} from "@blah-chat/persistence-postgres";
import { and, eq, lt } from "drizzle-orm";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export async function cleanupStaleIncognito(
  deps: { db?: PersistenceDb; now?: number } = {},
) {
  const db = deps.db ?? createNeonDatabase(getDatabaseUrl());
  const now = deps.now ?? Date.now();
  const cutoff = now - TWENTY_FOUR_HOURS_MS;

  // Staleness keys off conversations.updatedAt, which is bumped on activity.
  // incognitoSettings.lastActivityAt is never updated after creation, so it
  // would mark actively used incognito chats as stale.
  const deleted = await db
    .delete(conversations)
    .where(
      and(
        eq(conversations.isIncognito, true),
        lt(conversations.updatedAt, cutoff),
      ),
    )
    .returning();

  return { deleted: deleted.length };
}
