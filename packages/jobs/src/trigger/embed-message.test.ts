import {
  createConversationRepository,
  createMessageRepository,
  createUserRepository,
  messageEmbeddings,
} from "@blah-chat/persistence-postgres";
import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createTestPersistenceDb } from "../../../persistence-postgres/src/testing/pglite";
import { embedMessage } from "./embed-message";

// The pglite bootstrap schema lags behind schema.ts, which declares this
// unique index (message_embeddings_by_message); the upsert relies on it.
async function createDb() {
  const db = await createTestPersistenceDb();
  await db.execute(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS message_embeddings_by_message ON message_embeddings (message_id)`,
  );
  return db;
}

describe("embedMessage", () => {
  it("generates embedding and inserts into messageEmbeddings", async () => {
    const db = await createDb();
    const users = createUserRepository(db);
    const conversations = createConversationRepository(db);
    const messages = createMessageRepository(db);

    const user = await users.upsertFromClerk({
      clerkId: "clerk_embed_msg",
      email: "embed-msg@example.com",
      name: "Embed Message",
    });

    const conversation = await conversations.create({
      userId: user.id,
      title: "Embedding test",
      model: "openai:gpt-5-mini",
    });

    const message = await messages.create({
      conversationId: conversation.id,
      userId: user.id,
      role: "user",
      content: "This message should be embedded for search retrieval.",
      parentMessageIds: [],
      siblingIndex: 0,
    });

    const result = await embedMessage(
      { messageId: message.id },
      {
        db,
        now: () => 100,
        embedBatch: async (values) => values.map(() => [0.1, 0.2, 0.3]),
      },
    );

    expect(result).toMatchObject({ success: true });

    const rows = await db.query.messageEmbeddings.findMany({
      where: eq(messageEmbeddings.messageId, message.id),
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      messageId: message.id,
      conversationId: conversation.id,
      userId: user.id,
      embedding: [0.1, 0.2, 0.3],
    });
    expect(rows[0]?.content).toContain("embedded for search retrieval");
    expect(rows[0]?.searchDocument).toContain("embedded for search retrieval");
  });

  it("skips if message not found", async () => {
    const db = await createDb();
    const result = await embedMessage(
      { messageId: "nonexistent" },
      {
        db,
        now: () => 100,
        embedBatch: async (values) => values.map(() => [0.1, 0.2]),
      },
    );

    expect(result).toMatchObject({ success: true, skipped: "not_found" });
  });

  it("is idempotent - upserts on re-embed", async () => {
    const db = await createDb();
    const users = createUserRepository(db);
    const conversations = createConversationRepository(db);
    const messages = createMessageRepository(db);

    const user = await users.upsertFromClerk({
      clerkId: "clerk_embed_idem",
      email: "idem@example.com",
      name: "Idempotent",
    });

    const conversation = await conversations.create({
      userId: user.id,
      title: "Idempotent test",
      model: "openai:gpt-5-mini",
    });

    const message = await messages.create({
      conversationId: conversation.id,
      userId: user.id,
      role: "assistant",
      content: "Response content",
      parentMessageIds: [],
      siblingIndex: 0,
    });

    const deps = {
      db,
      now: () => 200,
      embedBatch: async (values: string[]) => values.map(() => [0.4, 0.5, 0.6]),
    };

    await embedMessage({ messageId: message.id }, deps);
    await embedMessage(
      { messageId: message.id },
      {
        ...deps,
        embedBatch: async (values) => values.map(() => [0.7, 0.8, 0.9]),
      },
    );

    const rows = await db.query.messageEmbeddings.findMany({
      where: eq(messageEmbeddings.messageId, message.id),
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.embedding).toEqual([0.7, 0.8, 0.9]);
  });
});
