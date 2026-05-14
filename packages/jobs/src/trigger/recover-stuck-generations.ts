import {
  createNeonDatabase,
  generationRequests,
  type PersistenceDb,
} from "@blah-chat/persistence-postgres";
import { and, inArray, lt } from "drizzle-orm";
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
  const recovered = await db
    .update(generationRequests)
    .set({ status: "pending", updatedAt: now })
    .where(
      and(
        inArray(generationRequests.status, ["running", "cancelling"]),
        lt(generationRequests.updatedAt, cutoff),
      ),
    )
    .returning();

  for (const row of recovered) {
    await enqueue(row.id);
  }

  return { recovered: recovered.length };
}
