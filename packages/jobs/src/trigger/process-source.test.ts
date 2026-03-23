import {
  createUserRepository,
  knowledgeChunks,
  knowledgeSources,
} from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createTestPersistenceDb } from "../../../persistence-postgres/src/testing/pglite";
import { processKnowledgeSource } from "./process-source";

describe("processKnowledgeSource", () => {
  it("processes a Postgres knowledge source and stores embedded knowledge chunks", async () => {
    const db = await createTestPersistenceDb();
    const users = createUserRepository(db);

    const user = await users.upsertFromClerk({
      clerkId: "clerk_knowledge_source",
      email: "knowledge-source@example.com",
      name: "Knowledge Source",
    });

    const [source] = await db
      .insert(knowledgeSources)
      .values({
        userId: user.id,
        type: "text",
        title: "Architecture Notes",
        rawContent:
          "Phase 12 moves long-running work off Convex and into Trigger plus Postgres-owned jobs.",
        status: "pending",
        createdAt: 1,
        updatedAt: 1,
      })
      .returning();

    const result = await processKnowledgeSource(
      { sourceId: source!.id },
      {
        db,
        now: () => 123,
        embedBatch: async (values) => values.map(() => [0.4, 0.5, 0.6]),
      },
    );

    expect(result).toMatchObject({
      success: true,
      chunkCount: 1,
    });

    const storedSource = await db.query.knowledgeSources.findFirst({
      where: eq(knowledgeSources.id, source!.id),
    });
    const storedChunks = await db.query.knowledgeChunks.findMany({
      where: eq(knowledgeChunks.sourceKey, source!.id),
    });

    expect(storedSource).toMatchObject({
      id: source!.id,
      status: "completed",
      chunkCount: 1,
      processedAt: 123,
    });
    expect(storedChunks).toHaveLength(1);
    expect(storedChunks[0]).toMatchObject({
      userId: user.id,
      sourceKey: source!.id,
      chunkIndex: 0,
      embedding: [0.4, 0.5, 0.6],
    });
    expect(storedChunks[0]?.content).toContain("long-running work off Convex");
  });
});
