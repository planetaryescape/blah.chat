import {
  createNeonDatabase,
  generationSessions,
  messages,
  type PersistenceDb,
} from "@blah-chat/persistence-postgres";
import { and, eq, inArray, lt, or } from "drizzle-orm";

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

  // Single-statement update: the staleness predicate lives in the WHERE so a
  // message that progressed between scheduling and execution is never
  // clobbered (no select-then-update race).
  const recovered = await db
    .update(messages)
    .set({
      status: "error",
      updatedAt: now,
    })
    .where(
      and(
        or(eq(messages.status, "pending"), eq(messages.status, "generating")),
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
