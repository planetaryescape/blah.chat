import {
  createNeonDatabase,
  generationSessions,
  messages,
  type PersistenceDb,
} from "@blah-chat/persistence-postgres";
import { and, eq, inArray, lt, or, sql } from "drizzle-orm";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

const STUCK_THRESHOLD_MS = 10 * 60 * 1000;

export async function recoverStuckMessages(
  deps: { db?: PersistenceDb; now?: number } = {},
) {
  const db = deps.db ?? createNeonDatabase(getDatabaseUrl());
  const now = deps.now ?? Date.now();
  const cutoff = now - STUCK_THRESHOLD_MS;

  // Find stuck messages (pending or generating with old updatedAt)
  const stuckMessages = await db
    .select({ id: messages.id, conversationId: messages.conversationId })
    .from(messages)
    .where(
      and(
        or(eq(messages.status, "pending"), eq(messages.status, "generating")),
        lt(messages.updatedAt, cutoff),
      ),
    );

  if (stuckMessages.length === 0) {
    return { recovered: 0 };
  }

  // Mark stuck messages as error
  const stuckIds = stuckMessages.map((m) => m.id);
  await db
    .update(messages)
    .set({
      status: "error",
      updatedAt: now,
    })
    .where(inArray(messages.id, stuckIds));

  // Fail pending generation sessions for affected conversations
  const conversationIds = [
    ...new Set(stuckMessages.map((m) => m.conversationId)),
  ];
  if (conversationIds.length > 0) {
    await db
      .update(generationSessions)
      .set({ status: "failed", updatedAt: now })
      .where(
        and(
          eq(generationSessions.status, "pending"),
          inArray(
            generationSessions.requestId,
            db
              .select({
                id: sql<string>`generation_requests.id`,
              })
              .from(sql`generation_requests`)
              .where(
                inArray(
                  sql`generation_requests.conversation_id`,
                  conversationIds,
                ),
              ),
          ),
        ),
      );
  }

  return { recovered: stuckMessages.length };
}
