import {
  createConversationRepository,
  createMessageRepository,
  createUserRepository,
  messageEmbeddings,
  notes,
  tasks,
} from "@blah-chat/persistence-postgres";
import { describe, expect, it } from "vitest";
import { createTestPersistenceDb } from "../../../persistence-postgres/src/testing/pglite";
import {
  backfillMessageEmbeddings,
  backfillNoteEmbeddings,
  backfillTaskEmbeddings,
} from "./backfill-embeddings";

describe("backfillMessageEmbeddings", () => {
  it("embeds messages that lack embeddings", async () => {
    const db = await createTestPersistenceDb();
    const users = createUserRepository(db);
    const conversations = createConversationRepository(db);
    const messages = createMessageRepository(db);

    const user = await users.upsertFromClerk({
      clerkId: "backfill_msg",
      email: "backfill@example.com",
      name: "Backfill User",
    });

    const conv = await conversations.create({
      userId: user.id,
      title: "Backfill conv",
      model: "openai:gpt-5-mini",
    });

    const msg1 = await messages.create({
      conversationId: conv.id,
      userId: user.id,
      role: "user",
      content: "Message without embedding",
      parentMessageIds: [],
      siblingIndex: 0,
    });

    const msg2 = await messages.create({
      conversationId: conv.id,
      userId: user.id,
      role: "assistant",
      content: "Already embedded message",
      parentMessageIds: [msg1.id],
      siblingIndex: 0,
    });

    // Give msg2 an embedding already
    await db.insert(messageEmbeddings).values({
      messageId: msg2.id,
      conversationId: conv.id,
      userId: user.id,
      content: msg2.content,
      embedding: [0.1, 0.2],
      searchDocument: msg2.content,
      createdAt: 1,
      updatedAt: 1,
    });

    const result = await backfillMessageEmbeddings(
      { batchSize: 50 },
      {
        db,
        now: () => 100,
        embedBatch: async (values) => values.map(() => [0.3, 0.4]),
      },
    );

    expect(result.processed).toBe(1);
    const allEmbeddings = await db.query.messageEmbeddings.findMany();
    expect(allEmbeddings).toHaveLength(2);
  });

  it("respects batchSize limit", async () => {
    const db = await createTestPersistenceDb();
    const users = createUserRepository(db);
    const conversations = createConversationRepository(db);
    const messages = createMessageRepository(db);

    const user = await users.upsertFromClerk({
      clerkId: "backfill_batch",
      email: "batch@example.com",
      name: "Batch User",
    });

    const conv = await conversations.create({
      userId: user.id,
      title: "Batch conv",
      model: "openai:gpt-5-mini",
    });

    for (let i = 0; i < 5; i++) {
      await messages.create({
        conversationId: conv.id,
        userId: user.id,
        role: "user",
        content: `Message number ${i}`,
        parentMessageIds: [],
        siblingIndex: i,
      });
    }

    const result = await backfillMessageEmbeddings(
      { batchSize: 2 },
      {
        db,
        now: () => 100,
        embedBatch: async (values) => values.map(() => [0.1]),
      },
    );

    expect(result.processed).toBe(2);
  });
});

describe("backfillNoteEmbeddings", () => {
  it("embeds notes that lack embeddings", async () => {
    const db = await createTestPersistenceDb();
    const users = createUserRepository(db);

    const user = await users.upsertFromClerk({
      clerkId: "backfill_note",
      email: "note@example.com",
      name: "Note User",
    });

    await db.insert(notes).values({
      userId: user.id,
      title: "Unfilled note",
      content: "Needs embedding",
      tags: [],
      isPinned: false,
      createdAt: 1,
      updatedAt: 1,
    });

    const result = await backfillNoteEmbeddings(
      { batchSize: 50 },
      {
        db,
        now: () => 100,
        embedBatch: async (values) => values.map(() => [0.5]),
      },
    );

    expect(result.processed).toBe(1);
    const allEmbeddings = await db.query.noteEmbeddings.findMany();
    expect(allEmbeddings).toHaveLength(1);
  });
});

describe("backfillTaskEmbeddings", () => {
  it("embeds tasks that lack embeddings", async () => {
    const db = await createTestPersistenceDb();
    const users = createUserRepository(db);

    const user = await users.upsertFromClerk({
      clerkId: "backfill_task",
      email: "task@example.com",
      name: "Task User",
    });

    await db.insert(tasks).values({
      userId: user.id,
      title: "Unfilled task",
      description: "Needs embedding",
      status: "in_progress",
      tags: [],
      createdAt: 1,
      updatedAt: 1,
    });

    const result = await backfillTaskEmbeddings(
      { batchSize: 50 },
      {
        db,
        now: () => 100,
        embedBatch: async (values) => values.map(() => [0.6]),
      },
    );

    expect(result.processed).toBe(1);
    const allEmbeddings = await db.query.taskEmbeddings.findMany();
    expect(allEmbeddings).toHaveLength(1);
  });
});
