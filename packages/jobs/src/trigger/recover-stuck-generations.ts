import {
  createNeonDatabase,
  generationRequests,
  generationSessions,
  type PersistenceDb,
} from "@blah-chat/persistence-postgres";
import { and, asc, eq, gte, inArray, lt, notExists, sql } from "drizzle-orm";
import { processGenerationTask } from "./process-generation";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

const STUCK_THRESHOLD_MS = 90 * 1000;
const DEFAULT_RECOVERY_BATCH_SIZE = 100;
const MAX_RECOVERY_BATCH_SIZE = 100;

export interface RecoverStuckGenerationsDeps {
  db?: PersistenceDb;
  now?: number;
  enqueue?: (requestId: string) => Promise<void>;
  batchSize?: number;
}

export async function recoverStuckGenerations(
  deps: RecoverStuckGenerationsDeps = {},
) {
  const db = deps.db ?? createNeonDatabase(getDatabaseUrl());
  const now = deps.now ?? Date.now();
  const cutoff = now - STUCK_THRESHOLD_MS;
  const batchSize = Math.min(
    Math.max(1, deps.batchSize ?? DEFAULT_RECOVERY_BATCH_SIZE),
    MAX_RECOVERY_BATCH_SIZE,
  );
  const enqueue =
    deps.enqueue ??
    (async (requestId: string) => {
      await processGenerationTask.trigger(
        { requestId },
        {
          concurrencyKey: requestId,
          idempotencyKey: `recover-generation:${requestId}`,
          idempotencyKeyTTL: "15m",
        },
      );
    });

  // Reset stale running/cancelling requests back to pending so the next worker
  // can re-claim via the pending->running CAS in service.process.
  // Staleness is judged against both the request's own updatedAt and the
  // freshest of its generation_sessions: the web app heartbeats session
  // updatedAt on every checkpoint, so a request with any fresh session is
  // still alive even if request.updatedAt lagged behind.
  const staleRequests = await db
    .select({
      id: generationRequests.id,
      status: generationRequests.status,
      updatedAt: generationRequests.updatedAt,
    })
    .from(generationRequests)
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
    .orderBy(asc(generationRequests.updatedAt), asc(generationRequests.id))
    .limit(batchSize);

  if (staleRequests.length === 0) {
    return { recovered: 0 };
  }

  const staleRequestIds = staleRequests.map((request) => request.id);
  const staleRequestById = new Map(
    staleRequests.map((request) => [request.id, request]),
  );
  const recovered = await db
    .update(generationRequests)
    .set({ status: "pending", updatedAt: now })
    .where(
      and(
        inArray(generationRequests.id, staleRequestIds),
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

  const pendingEnqueue = new Set(recovered.map((row) => row.id));
  for (const row of recovered) {
    try {
      await enqueue(row.id);
      pendingEnqueue.delete(row.id);
    } catch (error) {
      for (const requestId of pendingEnqueue) {
        const original = staleRequestById.get(requestId);
        if (!original) continue;

        await db
          .update(generationRequests)
          .set({
            status: original.status,
            updatedAt: original.updatedAt,
          })
          .where(
            and(
              eq(generationRequests.id, requestId),
              eq(generationRequests.status, "pending"),
            ),
          );
      }
      throw error;
    }
  }

  return { recovered: recovered.length };
}
