import {
  conversations,
  createConversationRepository,
  createMessageRepository,
  createUserRepository,
  memoryEmbeddings,
} from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createTestPersistenceDb } from "../../../persistence-postgres/src/testing/pglite";
import { extractInactiveConversations } from "./extract-inactive-conversations";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

async function seedConversationWithMessages(
  db: Awaited<ReturnType<typeof createTestPersistenceDb>>,
  opts: { updatedAtAge: number; messageCount: number },
) {
  const users = createUserRepository(db);
  const convos = createConversationRepository(db);
  const msgs = createMessageRepository(db);

  const user = await users.upsertFromClerk({
    clerkId: `clerk_${Math.random().toString(36).slice(2)}`,
    email: "test@example.com",
    name: "Test User",
  });

  const conversation = await convos.create({
    userId: user.id,
    title: "Test Conversation",
    model: "openai:gpt-5-mini",
  });

  const now = Date.now();
  // Backdate conversation
  await db
    .update(conversations)
    .set({ updatedAt: now - opts.updatedAtAge })
    .where(eq(conversations.id, conversation.id));

  // Create messages
  let lastMessageId: string | undefined;
  for (let i = 0; i < opts.messageCount; i++) {
    const msg = await msgs.create({
      conversationId: conversation.id,
      userId: user.id,
      role: i % 2 === 0 ? "user" : "assistant",
      content: `Message ${i}`,
      parentMessageIds: lastMessageId ? [lastMessageId] : [],
      siblingIndex: 0,
    });
    lastMessageId = msg.id;
  }

  return { user, conversation };
}

describe("extractInactiveConversations", () => {
  it("enqueues extraction for inactive conversations with enough messages", async () => {
    const db = await createTestPersistenceDb();
    const now = Date.now();
    const enqueued: Array<{ conversationId: string; userId: string }> = [];

    const { user, conversation } = await seedConversationWithMessages(db, {
      updatedAtAge: 30 * MINUTE,
      messageCount: 3,
    });

    const result = await extractInactiveConversations({
      db,
      now,
      enqueueExtraction: async (target) => {
        enqueued.push(target);
      },
    });

    expect(result.scheduled).toBe(1);
    expect(enqueued).toEqual([
      { conversationId: conversation.id, userId: user.id },
    ]);
  });

  it("skips conversations that are too recent (still active)", async () => {
    const db = await createTestPersistenceDb();
    const now = Date.now();
    const enqueued: string[] = [];

    await seedConversationWithMessages(db, {
      updatedAtAge: 5 * MINUTE,
      messageCount: 3,
    });

    const result = await extractInactiveConversations({
      db,
      now,
      enqueueExtraction: async (target) => {
        enqueued.push(target.conversationId);
      },
    });

    expect(result.scheduled).toBe(0);
    expect(enqueued).toHaveLength(0);
  });

  it("skips conversations older than 7 days", async () => {
    const db = await createTestPersistenceDb();
    const now = Date.now();
    const enqueued: string[] = [];

    await seedConversationWithMessages(db, {
      updatedAtAge: 8 * DAY,
      messageCount: 3,
    });

    const result = await extractInactiveConversations({
      db,
      now,
      enqueueExtraction: async (target) => {
        enqueued.push(target.conversationId);
      },
    });

    expect(result.scheduled).toBe(0);
  });

  it("skips conversations with fewer than 2 messages", async () => {
    const db = await createTestPersistenceDb();
    const now = Date.now();
    const enqueued: string[] = [];

    await seedConversationWithMessages(db, {
      updatedAtAge: 30 * MINUTE,
      messageCount: 1,
    });

    const result = await extractInactiveConversations({
      db,
      now,
      enqueueExtraction: async (target) => {
        enqueued.push(target.conversationId);
      },
    });

    expect(result.scheduled).toBe(0);
  });

  it("skips conversations that already have memories", async () => {
    const db = await createTestPersistenceDb();
    const now = Date.now();
    const enqueued: string[] = [];

    const { user, conversation } = await seedConversationWithMessages(db, {
      updatedAtAge: 30 * MINUTE,
      messageCount: 3,
    });

    // Add an existing memory for this conversation
    const dummyEmbedding = Array.from({ length: 1536 }, () => 0.01);
    await db.insert(memoryEmbeddings).values({
      userId: user.id,
      conversationId: conversation.id,
      content: "Existing memory",
      embedding: dummyEmbedding,
      createdAt: now,
      updatedAt: now,
    });

    const result = await extractInactiveConversations({
      db,
      now,
      enqueueExtraction: async (target) => {
        enqueued.push(target.conversationId);
      },
    });

    expect(result.scheduled).toBe(0);
  });
});
