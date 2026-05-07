/**
 * @vitest-environment node
 */
import {
  createConversationRepository,
  createUserRepository,
  messages,
} from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createTestPersistenceDb } from "../../../../../../packages/persistence-postgres/src/testing/pglite";
import { createGenerationV2Repository } from "../repository";

async function seedConversation(
  db: Awaited<ReturnType<typeof createTestPersistenceDb>>,
  clerkSeed: string,
) {
  const users = createUserRepository(db);
  const convos = createConversationRepository(db);
  const user = await users.upsertFromClerk({
    clerkId: `clerk_${clerkSeed}`,
    email: `${clerkSeed}@test.com`,
    name: clerkSeed,
  });
  const conversation = await convos.create({
    userId: user.id,
    title: "Idempotency",
    model: "openai:gpt-5-mini",
  });
  return { user, conversation };
}

async function insertMessage(
  db: Awaited<ReturnType<typeof createTestPersistenceDb>>,
  opts: {
    conversationId: string;
    userId: string;
    clientMessageId: string | null;
  },
) {
  const now = Date.now();
  return db.insert(messages).values({
    conversationId: opts.conversationId,
    userId: opts.userId,
    role: "user",
    content: "hi",
    status: "complete",
    clientMessageId: opts.clientMessageId,
    siblingIndex: 0,
    createdAt: now,
    updatedAt: now,
  });
}

describe("messages partial unique index on (conversation_id, client_message_id)", () => {
  it("rejects two non-null clientMessageId values that collide within one conversation", async () => {
    const db = await createTestPersistenceDb();
    const { user, conversation } = await seedConversation(db, "collide");

    await insertMessage(db, {
      conversationId: conversation.id,
      userId: user.id,
      clientMessageId: "client-abc",
    });

    await expect(
      insertMessage(db, {
        conversationId: conversation.id,
        userId: user.id,
        clientMessageId: "client-abc",
      }),
    ).rejects.toThrow();
  });

  it("allows the same clientMessageId in different conversations", async () => {
    const db = await createTestPersistenceDb();
    const { user, conversation: a } = await seedConversation(db, "convA");
    const { user: userB, conversation: b } = await seedConversation(
      db,
      "convB",
    );

    await insertMessage(db, {
      conversationId: a.id,
      userId: user.id,
      clientMessageId: "shared",
    });
    await insertMessage(db, {
      conversationId: b.id,
      userId: userB.id,
      clientMessageId: "shared",
    });

    const rows = await db.query.messages.findMany({
      where: eq(messages.clientMessageId, "shared"),
    });
    expect(rows).toHaveLength(2);
  });

  it("allows multiple null clientMessageId rows in the same conversation", async () => {
    const db = await createTestPersistenceDb();
    const { user, conversation } = await seedConversation(db, "nulls");

    await insertMessage(db, {
      conversationId: conversation.id,
      userId: user.id,
      clientMessageId: null,
    });
    await insertMessage(db, {
      conversationId: conversation.id,
      userId: user.id,
      clientMessageId: null,
    });

    const rows = await db.query.messages.findMany({
      where: eq(messages.conversationId, conversation.id),
    });
    expect(rows).toHaveLength(2);
  });
});

describe("createRequest idempotency on clientMessageId", () => {
  it("returns the existing bundle without creating duplicates when called twice with the same (conversation, clientMessageId)", async () => {
    const db = await createTestPersistenceDb();
    const { conversation } = await seedConversation(db, "idem");
    const repo = createGenerationV2Repository(db);

    const clerkUser = {
      clerkId: "clerk_idem",
      email: "idem@test.com",
      name: "idem",
    };

    const first = await repo.createRequest({
      clerkUser,
      conversationId: conversation.id,
      content: "Say hi",
      clientMessageId: "client-idem-1",
      modelId: "openai:gpt-5-mini",
    });

    const second = await repo.createRequest({
      clerkUser,
      conversationId: conversation.id,
      content: "Say hi",
      clientMessageId: "client-idem-1",
      modelId: "openai:gpt-5-mini",
    });

    expect(second.requestId).toBe(first.requestId);
    expect(second.userMessageId).toBe(first.userMessageId);
    expect(second.assistantMessageIds).toEqual(first.assistantMessageIds);

    const userMessages = await db.query.messages.findMany({
      where: eq(messages.clientMessageId, "client-idem-1"),
    });
    expect(userMessages).toHaveLength(1);
  });
});
