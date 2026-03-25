import * as schema from "../src/schema";
import { createTestPersistenceDb } from "../src/testing/pglite";

describe("persistence schema inventory", () => {
  test("exports the canonical rewrite tables beyond the core chat entities", () => {
    expect(schema.bookmarks).toBeDefined();
    expect(schema.projects).toBeDefined();
    expect(schema.templates).toBeDefined();
    expect(schema.starterSuggestionCaches).toBeDefined();
    expect(schema.cliApiKeys).toBeDefined();
    expect(schema.userApiKeys).toBeDefined();
    expect(schema.composioConnections).toBeDefined();
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

    const [project] = await db
      .insert(schema.projects)
      .values({
        userId: user!.id,
        name: "Rewrite Project",
        description: "Offline resume",
        createdAt: 1,
        updatedAt: 1,
      })
      .returning();

    const [template] = await db
      .insert(schema.templates)
      .values({
        name: "Daily Standup",
        prompt: "Summarize blockers",
        category: "work",
        isBuiltIn: true,
        isPublic: true,
        usageCount: 3,
        createdAt: 1,
        updatedAt: 1,
      })
      .returning();

    const [starterCache] = await db
      .insert(schema.starterSuggestionCaches)
      .values({
        userId: user!.id,
        suggestions: [{ id: "one", text: "Draft a roadmap", icon: "sparkles" }],
        needsRefresh: false,
        generatedAt: 1,
        source: "cache",
        createdAt: 1,
        updatedAt: 1,
      })
      .returning();

    const [cliKey] = await db
      .insert(schema.cliApiKeys)
      .values({
        userId: user!.id,
        keyHash: "hash",
        keyPrefix: "blah_abcd...",
        name: "CLI Login",
        createdAt: 1,
      })
      .returning();

    const [userApiKey] = await db
      .insert(schema.userApiKeys)
      .values({
        userId: user!.id,
        byokEnabled: false,
        createdAt: 1,
        updatedAt: 1,
      })
      .returning();

    const [composioConnection] = await db
      .insert(schema.composioConnections)
      .values({
        userId: user!.id,
        composioConnectionId: "conn_123",
        integrationId: "github",
        integrationName: "GitHub",
        status: "initiated",
        createdAt: 1,
        updatedAt: 1,
      })
      .returning();

    expect(policy?.name).toBe("default");
    expect(snapshot?.provider).toBe("openai");
    expect(bookmark?.messageId).toBe(message?.id);
    expect(project?.name).toBe("Rewrite Project");
    expect(template?.name).toBe("Daily Standup");
    expect(starterCache?.userId).toBe(user?.id);
    expect(cliKey?.keyPrefix).toBe("blah_abcd...");
    expect(userApiKey?.userId).toBe(user?.id);
    expect(composioConnection?.integrationId).toBe("github");
    expect(note?.projectId).toBe("project_alpha");
    expect(task?.status).toBe("in_progress");
  });

  test("pgvector embedding round-trip and cosine distance query", async () => {
    const { sql } = await import("drizzle-orm");
    const { serializeVector } = await import("../src/vector-type");
    const db = await createTestPersistenceDb();

    const [user] = await db
      .insert(schema.users)
      .values({
        clerkId: "vec_test",
        email: "vec@test.com",
        name: "Vector Test",
        createdAt: 1,
        updatedAt: 1,
      })
      .returning();

    const [conversation] = await db
      .insert(schema.conversations)
      .values({
        userId: user!.id,
        title: "Vector Test Conv",
        model: "openai:gpt-5-mini",
        createdAt: 1,
        updatedAt: 1,
      })
      .returning();

    const [msg1] = await db
      .insert(schema.messages)
      .values({
        conversationId: conversation!.id,
        userId: user!.id,
        role: "user",
        content: "Hello world",
        status: "complete",
        siblingIndex: 0,
        createdAt: 1,
        updatedAt: 1,
      })
      .returning();

    const [msg2] = await db
      .insert(schema.messages)
      .values({
        conversationId: conversation!.id,
        userId: user!.id,
        role: "user",
        content: "Goodbye world",
        status: "complete",
        siblingIndex: 1,
        createdAt: 2,
        updatedAt: 2,
      })
      .returning();

    const vecA = [1, 0, 0];
    const vecB = [0, 1, 0];

    await db.insert(schema.messageEmbeddings).values([
      {
        messageId: msg1!.id,
        conversationId: conversation!.id,
        userId: user!.id,
        content: "Hello world",
        embedding: vecA,
        searchDocument: "Hello world",
        createdAt: 1,
        updatedAt: 1,
      },
      {
        messageId: msg2!.id,
        conversationId: conversation!.id,
        userId: user!.id,
        content: "Goodbye world",
        embedding: vecB,
        searchDocument: "Goodbye world",
        createdAt: 2,
        updatedAt: 2,
      },
    ]);

    // Verify round-trip: embedding stored and retrieved as number[]
    const rows = await db.query.messageEmbeddings.findMany();
    expect(rows).toHaveLength(2);
    expect(rows[0]!.embedding).toEqual(vecA);
    expect(rows[1]!.embedding).toEqual(vecB);

    // Verify cosine distance query via raw SQL
    const queryVec = serializeVector([1, 0, 0]);
    const results = await db.execute(
      sql`SELECT me.message_id, (1 - (me.embedding <=> ${queryVec}::vector)) as similarity
          FROM message_embeddings me
          ORDER BY me.embedding <=> ${queryVec}::vector ASC`,
    );
    expect(results.rows).toHaveLength(2);
    expect((results.rows[0] as any).message_id).toBe(msg1!.id);
    expect(Number((results.rows[0] as any).similarity)).toBeCloseTo(1, 3);
  });

  test("tsvector full-text search via search_tsv generated column", async () => {
    const { sql } = await import("drizzle-orm");
    const db = await createTestPersistenceDb();

    const [user] = await db
      .insert(schema.users)
      .values({
        clerkId: "fts_test",
        email: "fts@test.com",
        name: "FTS Test",
        createdAt: 1,
        updatedAt: 1,
      })
      .returning();

    const [conversation] = await db
      .insert(schema.conversations)
      .values({
        userId: user!.id,
        title: "FTS Test Conv",
        model: "openai:gpt-5-mini",
        createdAt: 1,
        updatedAt: 1,
      })
      .returning();

    const [msg] = await db
      .insert(schema.messages)
      .values({
        conversationId: conversation!.id,
        userId: user!.id,
        role: "assistant",
        content: "The quick brown fox jumps over the lazy dog",
        status: "complete",
        siblingIndex: 0,
        createdAt: 1,
        updatedAt: 1,
      })
      .returning();

    await db.insert(schema.messageEmbeddings).values({
      messageId: msg!.id,
      conversationId: conversation!.id,
      userId: user!.id,
      content: "The quick brown fox jumps over the lazy dog",
      embedding: [0.1, 0.2, 0.3],
      searchDocument: "The quick brown fox jumps over the lazy dog",
      createdAt: 1,
      updatedAt: 1,
    });

    // Query using tsvector full-text search
    const results = await db.execute(
      sql`SELECT me.message_id, ts_rank(me.search_tsv, plainto_tsquery('english', 'brown fox')) as rank
          FROM message_embeddings me
          WHERE me.search_tsv @@ plainto_tsquery('english', 'brown fox')`,
    );
    expect(results.rows).toHaveLength(1);
    expect((results.rows[0] as any).message_id).toBe(msg!.id);
    expect(Number((results.rows[0] as any).rank)).toBeGreaterThan(0);

    // Non-matching query returns empty
    const noMatch = await db.execute(
      sql`SELECT me.message_id
          FROM message_embeddings me
          WHERE me.search_tsv @@ plainto_tsquery('english', 'elephant')`,
    );
    expect(noMatch.rows).toHaveLength(0);
  });
});
