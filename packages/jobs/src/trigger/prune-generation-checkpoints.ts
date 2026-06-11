import {
  createNeonDatabase,
  generationCheckpoints,
  type PersistenceDb,
} from "@blah-chat/persistence-postgres";
import { lt } from "drizzle-orm";
import { getDatabaseUrl } from "./maintenance-utils";

// Checkpoints exist to resume/replay in-flight generations; anything older
// than 30 days is long past useful and only grows the table.
const CHECKPOINT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export async function pruneGenerationCheckpoints(
  deps: { db?: PersistenceDb; now?: number } = {},
) {
  const db = deps.db ?? createNeonDatabase(getDatabaseUrl());
  const now = deps.now ?? Date.now();
  const cutoff = now - CHECKPOINT_RETENTION_MS;

  const result = await db
    .delete(generationCheckpoints)
    .where(lt(generationCheckpoints.createdAt, cutoff))
    .returning();

  return { pruned: result.length };
}
