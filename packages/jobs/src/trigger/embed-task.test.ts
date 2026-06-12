import {
  createUserRepository,
  taskEmbeddings,
  tasks,
} from "@blah-chat/persistence-postgres";
import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createTestPersistenceDb } from "../../../persistence-postgres/src/testing/pglite";
import { embedTask } from "./embed-task";

// The pglite bootstrap schema lags behind schema.ts, which declares this
// unique index (task_embeddings_by_task_key); the upsert relies on it.
async function createDb() {
  const db = await createTestPersistenceDb();
  await db.execute(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS task_embeddings_by_task_key ON task_embeddings (task_key)`,
  );
  return db;
}

describe("embedTask", () => {
  it("generates embedding from title + description and inserts into taskEmbeddings", async () => {
    const db = await createDb();
    const users = createUserRepository(db);

    const user = await users.upsertFromClerk({
      clerkId: "clerk_embed_task",
      email: "embed-task@example.com",
      name: "Embed Task",
    });

    const [task] = await db
      .insert(tasks)
      .values({
        userId: user.id,
        title: "Migrate embeddings to pgvector",
        description:
          "Convert all jsonb embedding columns to native vector type.",
        status: "in_progress",
        tags: ["postgres"],
        createdAt: 1,
        updatedAt: 1,
      })
      .returning();

    const result = await embedTask(
      { taskId: task!.id },
      {
        db,
        now: () => 100,
        embedBatch: async (values) => {
          expect(values[0]).toContain("Migrate embeddings");
          expect(values[0]).toContain("native vector type");
          return values.map(() => [0.5, 0.6, 0.7]);
        },
      },
    );

    expect(result).toMatchObject({ success: true });

    const rows = await db.query.taskEmbeddings.findMany({
      where: eq(taskEmbeddings.taskKey, task!.id),
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.embedding).toEqual([0.5, 0.6, 0.7]);
    expect(rows[0]?.userId).toBe(user.id);
  });

  it("skips if task not found", async () => {
    const db = await createDb();
    const result = await embedTask(
      { taskId: "nonexistent" },
      { db, now: () => 1, embedBatch: async (v) => v.map(() => [0.1]) },
    );
    expect(result).toMatchObject({ success: true, skipped: "not_found" });
  });

  it("handles task with no description", async () => {
    const db = await createDb();
    const users = createUserRepository(db);

    const user = await users.upsertFromClerk({
      clerkId: "clerk_task_nodesc",
      email: "nodesc@example.com",
      name: "No Desc",
    });

    const [task] = await db
      .insert(tasks)
      .values({
        userId: user.id,
        title: "Quick fix",
        status: "in_progress",
        tags: [],
        createdAt: 1,
        updatedAt: 1,
      })
      .returning();

    const result = await embedTask(
      { taskId: task!.id },
      {
        db,
        now: () => 1,
        embedBatch: async (values) => {
          expect(values[0]).toBe("Quick fix");
          return values.map(() => [0.1]);
        },
      },
    );

    expect(result).toMatchObject({ success: true });
  });
});
