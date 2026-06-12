import { EMBEDDING_MODEL } from "@blah-chat/ai/operational-models";
import {
  createNeonDatabase,
  type PersistenceDb,
  taskEmbeddings,
  tasks,
} from "@blah-chat/persistence-postgres";
import { task } from "@trigger.dev/sdk";
import { embedMany } from "ai";
import { eq } from "drizzle-orm";

type EmbedBatch = (values: string[]) => Promise<number[][]>;

export interface EmbedTaskDependencies {
  db?: PersistenceDb;
  now?: () => number;
  embedBatch?: EmbedBatch;
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }
  return databaseUrl;
}

function createDefaultEmbedBatch(): EmbedBatch {
  return async (values) => {
    const result = await embedMany({ model: EMBEDDING_MODEL, values });
    return result.embeddings as number[][];
  };
}

export async function embedTask(
  payload: { taskId: string },
  dependencies: EmbedTaskDependencies = {},
) {
  const db = dependencies.db ?? createNeonDatabase(getDatabaseUrl());
  const now = dependencies.now ?? (() => Date.now());
  const embedBatch = dependencies.embedBatch ?? createDefaultEmbedBatch();

  const taskRow = await db.query.tasks.findFirst({
    where: eq(tasks.id, payload.taskId),
  });

  if (!taskRow) {
    return { success: true, skipped: "not_found" as const };
  }

  const content = [taskRow.title, taskRow.description]
    .filter(Boolean)
    .join("\n")
    .trim();
  if (!content) {
    return { success: true, skipped: "empty_content" as const };
  }

  const [embedding] = await embedBatch([content]);
  if (!embedding) {
    return { success: true, skipped: "embed_failed" as const };
  }

  const timestamp = now();

  // Atomic upsert on the task_embeddings.task_key unique index — no
  // delete-then-insert window where the row is missing.
  await db
    .insert(taskEmbeddings)
    .values({
      userId: taskRow.userId,
      taskKey: taskRow.id,
      content,
      embedding,
      searchDocument: content,
      metadata: { status: taskRow.status, tags: taskRow.tags },
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .onConflictDoUpdate({
      target: taskEmbeddings.taskKey,
      set: {
        userId: taskRow.userId,
        content,
        embedding,
        searchDocument: content,
        metadata: { status: taskRow.status, tags: taskRow.tags },
        updatedAt: timestamp,
      },
    });

  return { success: true };
}

export const embedTaskTask = task({
  id: "embed-task",
  // Serialize per entity: enqueuers pass concurrencyKey=taskId so each task
  // gets its own single-slot queue (stale runs can't clobber fresh).
  queue: { concurrencyLimit: 1 },
  maxDuration: 300,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  run: async (payload: { taskId: string }) => {
    return embedTask(payload);
  },
});
