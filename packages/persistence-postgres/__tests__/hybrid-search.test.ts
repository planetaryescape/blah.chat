import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { mergeByRrf, serializeVector } from "../src";
import * as schema from "../src/schema";
import { createTestPersistenceDb } from "../src/testing/pglite";

async function seedSearchData(
  db: Awaited<ReturnType<typeof createTestPersistenceDb>>,
) {
  const [user] = await db
    .insert(schema.users)
    .values({
      clerkId: "search_user",
      email: "search@test.com",
      name: "Search Tester",
      createdAt: 1,
      updatedAt: 1,
    })
    .returning();

  const [conversation] = await db
    .insert(schema.conversations)
    .values({
      userId: user!.id,
      title: "Search Test Conv",
      model: "openai:gpt-5-mini",
      createdAt: 1,
      updatedAt: 1,
    })
    .returning();

  // Message about TypeScript
  const [msg1] = await db
    .insert(schema.messages)
    .values({
      conversationId: conversation!.id,
      userId: user!.id,
      role: "assistant",
      content:
        "TypeScript is a typed superset of JavaScript that compiles to plain JavaScript.",
      status: "complete",
      siblingIndex: 0,
      createdAt: 100,
      updatedAt: 100,
    })
    .returning();

  // Message about Python
  const [msg2] = await db
    .insert(schema.messages)
    .values({
      conversationId: conversation!.id,
      userId: user!.id,
      role: "assistant",
      content:
        "Python is a high-level programming language known for readability.",
      status: "complete",
      siblingIndex: 1,
      createdAt: 200,
      updatedAt: 200,
    })
    .returning();

  // Message about Rust
  const [msg3] = await db
    .insert(schema.messages)
    .values({
      conversationId: conversation!.id,
      userId: user!.id,
      role: "user",
      content: "Tell me about Rust memory safety and ownership.",
      status: "complete",
      siblingIndex: 2,
      createdAt: 300,
      updatedAt: 300,
    })
    .returning();

  // Embeddings: TypeScript vec close to [1,0,0], Python close to [0,1,0], Rust close to [0,0,1]
  await db.insert(schema.messageEmbeddings).values([
    {
      messageId: msg1!.id,
      conversationId: conversation!.id,
      userId: user!.id,
      content: msg1!.content,
      embedding: [0.9, 0.1, 0.0],
      searchDocument: msg1!.content,
      createdAt: 100,
      updatedAt: 100,
    },
    {
      messageId: msg2!.id,
      conversationId: conversation!.id,
      userId: user!.id,
      content: msg2!.content,
      embedding: [0.1, 0.9, 0.0],
      searchDocument: msg2!.content,
      createdAt: 200,
      updatedAt: 200,
    },
    {
      messageId: msg3!.id,
      conversationId: conversation!.id,
      userId: user!.id,
      content: msg3!.content,
      embedding: [0.0, 0.1, 0.9],
      searchDocument: msg3!.content,
      createdAt: 300,
      updatedAt: 300,
    },
  ]);

  return {
    user: user!,
    conversation: conversation!,
    messages: [msg1!, msg2!, msg3!],
  };
}

describe("hybrid search with pgvector + tsvector", () => {
  it("full-text search returns results matching tsvector query", async () => {
    const db = await createTestPersistenceDb();
    await seedSearchData(db);

    const results = await db.execute(
      sql`SELECT me.message_id, ts_rank(me.search_tsv, plainto_tsquery('english', 'TypeScript JavaScript')) as rank
          FROM message_embeddings me
          WHERE me.search_tsv @@ plainto_tsquery('english', 'TypeScript JavaScript')
          ORDER BY rank DESC`,
    );

    expect(results.rows.length).toBeGreaterThan(0);
    const first = results.rows[0] as any;
    expect(Number(first.rank)).toBeGreaterThan(0);
  });

  it("vector search returns nearest neighbors by cosine distance", async () => {
    const db = await createTestPersistenceDb();
    const { messages: msgs } = await seedSearchData(db);

    // Query vector close to TypeScript embedding [0.9, 0.1, 0.0]
    const queryVec = serializeVector([0.95, 0.05, 0.0]);
    const results = await db.execute(
      sql`SELECT me.message_id, (1 - (me.embedding <=> ${queryVec}::vector)) as similarity
          FROM message_embeddings me
          ORDER BY me.embedding <=> ${queryVec}::vector ASC
          LIMIT 3`,
    );

    expect(results.rows).toHaveLength(3);
    // TypeScript message should be most similar
    expect((results.rows[0] as any).message_id).toBe(msgs[0]!.id);
    expect(Number((results.rows[0] as any).similarity)).toBeGreaterThan(0.9);
  });

  it("hybrid RRF merges text + vector results with boost for overlapping items", async () => {
    const db = await createTestPersistenceDb();
    const { messages: msgs } = await seedSearchData(db);

    // Text search for "TypeScript"
    const textResults = await db.execute(
      sql`SELECT me.message_id
          FROM message_embeddings me
          WHERE me.search_tsv @@ plainto_tsquery('english', 'TypeScript')
          ORDER BY ts_rank(me.search_tsv, plainto_tsquery('english', 'TypeScript')) DESC
          LIMIT 10`,
    );

    // Vector search close to TypeScript
    const queryVec = serializeVector([0.85, 0.15, 0.0]);
    const vectorResults = await db.execute(
      sql`SELECT me.message_id
          FROM message_embeddings me
          ORDER BY me.embedding <=> ${queryVec}::vector ASC
          LIMIT 10`,
    );

    const textItems = (textResults.rows as any[]).map((r) => ({
      id: r.message_id as string,
    }));
    const vectorItems = (vectorResults.rows as any[]).map((r) => ({
      id: r.message_id as string,
    }));

    const merged = mergeByRrf(textItems, vectorItems, 3);

    // TypeScript message appears in both text and vector results, so it should rank #1
    expect(merged[0]?.id).toBe(msgs[0]!.id);
  });

  it("non-matching text query returns empty results", async () => {
    const db = await createTestPersistenceDb();
    await seedSearchData(db);

    const results = await db.execute(
      sql`SELECT me.message_id
          FROM message_embeddings me
          WHERE me.search_tsv @@ plainto_tsquery('english', 'quantum entanglement')`,
    );

    expect(results.rows).toHaveLength(0);
  });
});
