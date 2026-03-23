import * as schema from "../src/schema";
import { createTestPersistenceDb } from "../src/testing/pglite";

describe("persistence schema inventory", () => {
  test("exports the canonical rewrite tables beyond the core chat entities", () => {
    expect(schema.bookmarks).toBeDefined();
    expect(schema.consolidations).toBeDefined();
    expect(schema.notes).toBeDefined();
    expect(schema.tasks).toBeDefined();
    expect(schema.routingPolicies).toBeDefined();
    expect(schema.routingDecisions).toBeDefined();
    expect(schema.routingCandidateScores).toBeDefined();
    expect(schema.routingOutcomes).toBeDefined();
    expect(schema.routingFeedback).toBeDefined();
    expect(schema.providerHealthSnapshots).toBeDefined();
    expect(schema.messageEmbeddings).toBeDefined();
    expect(schema.memoryEmbeddings).toBeDefined();
    expect(schema.taskEmbeddings).toBeDefined();
    expect(schema.noteEmbeddings).toBeDefined();
    expect(schema.fileChunks).toBeDefined();
    expect(schema.knowledgeChunks).toBeDefined();
    expect(schema.routingExamples).toBeDefined();
  });

  test("test database bootstrap includes the extended rewrite tables", async () => {
    const db = await createTestPersistenceDb();

    const [policy] = await db
      .insert(schema.routingPolicies)
      .values({
        name: "default",
        isActive: true,
        strategy: "outcome_weighted",
        config: { costBias: 0.3, speedBias: 0.7 },
      })
      .returning();

    const [snapshot] = await db
      .insert(schema.providerHealthSnapshots)
      .values({
        provider: "openai",
        modelId: "gpt-5",
        status: "healthy",
        latencyMs: 120,
        successRate: 0.99,
      })
      .returning();

    const [user] = await db
      .insert(schema.users)
      .values({
        clerkId: "schema_test",
        email: "schema@test.com",
        name: "Schema Test",
        createdAt: 1,
        updatedAt: 1,
      })
      .returning();

    const [conversation] = await db
      .insert(schema.conversations)
      .values({
        userId: user!.id,
        title: "Schema Bookmark Conversation",
        model: "openai:gpt-5-mini",
        createdAt: 1,
        updatedAt: 1,
      })
      .returning();

    const [message] = await db
      .insert(schema.messages)
      .values({
        conversationId: conversation!.id,
        userId: user!.id,
        role: "assistant",
        content: "Bookmark me",
        status: "complete",
        siblingIndex: 0,
        createdAt: 1,
        updatedAt: 1,
      })
      .returning();

    const [bookmark] = await db
      .insert(schema.bookmarks)
      .values({
        userId: user!.id,
        messageId: message!.id,
        conversationId: conversation!.id,
        tags: ["saved"],
        createdAt: 1,
        updatedAt: 1,
      })
      .returning();

    const [note] = await db
      .insert(schema.notes)
      .values({
        userId: user!.id,
        title: "Project note",
        content: "Track the rewrite plan",
        projectId: "project_alpha",
        tags: ["postgres"],
        isPinned: false,
        createdAt: 1,
        updatedAt: 1,
      })
      .returning();

    const [task] = await db
      .insert(schema.tasks)
      .values({
        userId: user!.id,
        title: "Ship postgres rewrite",
        projectId: "project_alpha",
        status: "in_progress",
        urgency: "high",
        tags: ["rewrite"],
        createdAt: 1,
        updatedAt: 1,
      })
      .returning();

    expect(policy?.name).toBe("default");
    expect(snapshot?.provider).toBe("openai");
    expect(bookmark?.messageId).toBe(message?.id);
    expect(note?.projectId).toBe("project_alpha");
    expect(task?.status).toBe("in_progress");
  });
});
