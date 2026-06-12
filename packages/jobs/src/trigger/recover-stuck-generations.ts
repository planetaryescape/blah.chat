import {
  createNeonDatabase,
  generationRequests,
  generationSessions,
  type PersistenceDb,
} from "@blah-chat/persistence-postgres";
import { and, eq, gte, inArray, lt, notExists, sql } from "drizzle-orm";
import { processGeneration } from "./process-generation";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

const STUCK_THRESHOLD_MS = 90 * 1000;

export interface RecoverStuckGenerationsDeps {
  db?: PersistenceDb;
  now?: number;
  enqueue?: (requestId: string) => Promise<void>;
}

export async function recoverStuckGenerations(
  deps: RecoverStuckGenerationsDeps = {},
) {
  const db = deps.db ?? createNeonDatabase(getDatabaseUrl());
  const now = deps.now ?? Date.now();
  const cutoff = now - STUCK_THRESHOLD_MS;
  const enqueue =
    deps.enqueue ??
    (async (requestId: string) => {
      await processGeneration({ requestId });
    });

  // Reset stale running/cancelling requests back to pending so the next worker
  // can re-claim via the pending->running CAS in service.process.
  // Staleness is judged against both the request's own updatedAt and the
  // freshest of its generation_sessions: the web app heartbeats session
  // updatedAt on every checkpoint, so a request with any fresh session is
  // still alive even if request.updatedAt lagged behind.
  const recovered = await db
    .update(generationRequests)
    .set({ status: "pending", updatedAt: now })
    .where(
      and(
        inArray(generationRequests.status, ["running", "cancelling"]),
        lt(generationRequests.updatedAt, cutoff),
        notExists(
          db
            .select({ one: sql`1` })
            .from(generationSessions)
            .where(
              and(
                eq(generationSessions.requestId, generationRequests.id),
                gte(generationSessions.updatedAt, cutoff),
              ),
            ),
        ),
      ),
    )
    .returning();

  for (const row of recovered) {
    await enqueue(row.id);
  }

  return { recovered: recovered.length };
}
