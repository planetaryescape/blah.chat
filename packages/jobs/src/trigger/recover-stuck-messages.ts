import {
  createNeonDatabase,
  generationSessions,
  messages,
  type PersistenceDb,
} from "@blah-chat/persistence-postgres";
import { and, asc, eq, inArray, lt } from "drizzle-orm";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

const STUCK_THRESHOLD_MS = 10 * 60 * 1000;
const DEFAULT_RECOVERY_BATCH_SIZE = 500;
const MAX_RECOVERY_BATCH_SIZE = 1000;

export async function recoverStuckMessages(
  deps: { db?: PersistenceDb; now?: number; batchSize?: number } = {},
) {
  const db = deps.db ?? createNeonDatabase(getDatabaseUrl());
  const now = deps.now ?? Date.now();
  const cutoff = now - STUCK_THRESHOLD_MS;
  const batchSize = Math.min(
    Math.max(1, deps.batchSize ?? DEFAULT_RECOVERY_BATCH_SIZE),
    MAX_RECOVERY_BATCH_SIZE,
  );

  const staleMessages = await db
    .select({ id: messages.id })
    .from(messages)
    .where(
      and(
        inArray(messages.status, ["pending", "generating"]),
        lt(messages.updatedAt, cutoff),
      ),
    )
    .orderBy(asc(messages.updatedAt), asc(messages.id))
    .limit(batchSize);

  if (staleMessages.length === 0) {
    return { recovered: 0 };
  }

  const staleMessageIds = staleMessages.map((message) => message.id);

  // Keep the staleness predicate in the update so a message that progressed
  // between selection and execution is never clobbered.
  const recovered = await db
    .update(messages)
    .set({
      status: "error",
      updatedAt: now,
    })
    .where(
      and(
        inArray(messages.id, staleMessageIds),
        inArray(messages.status, ["pending", "generating"]),
        lt(messages.updatedAt, cutoff),
      ),
    )
    .returning();

  if (recovered.length === 0) {
    return { recovered: 0 };
  }

  // Fail only the recovered messages' own sessions, with the same staleness
  // guard so an actively heartbeating session is left alone.
  const stuckIds = recovered.map((m) => m.id);
  await db
    .update(generationSessions)
    .set({ status: "error", updatedAt: now })
    .where(
      and(
        eq(generationSessions.status, "pending"),
        inArray(generationSessions.assistantMessageId, stuckIds),
        lt(generationSessions.updatedAt, cutoff),
      ),
    );

  return { recovered: recovered.length };
}
