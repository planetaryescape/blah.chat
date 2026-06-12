/**
 * @vitest-environment node
 */
import {
  createConversationRepository,
  createUserRepository,
  messages,
} from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
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

  it("adopts an orphaned user message (message persisted, request creation crashed)", async () => {
    const db = await createTestPersistenceDb();
    const { user, conversation } = await seedConversation(db, "orphan");
    const repo = createGenerationV2Repository(db);

    // Simulate a prior attempt that persisted the user message but crashed
    // before creating the generation request.
    await insertMessage(db, {
      conversationId: conversation.id,
      userId: user.id,
      clientMessageId: "client-orphan-1",
    });

    const adopted = await repo.createRequest({
      clerkUser: {
        clerkId: "clerk_orphan",
        email: "orphan@test.com",
        name: "orphan",
      },
      conversationId: conversation.id,
      content: "hi",
      clientMessageId: "client-orphan-1",
      modelId: "openai:gpt-5-mini",
    });

    const orphanRows = await db.query.messages.findMany({
      where: eq(messages.clientMessageId, "client-orphan-1"),
    });
    expect(orphanRows).toHaveLength(1);
    expect(adopted.userMessageId).toBe(orphanRows[0]!.id);
    expect(adopted.assistantMessageIds).toHaveLength(1);

    // A retry after adoption returns the same bundle.
    const retried = await repo.createRequest({
      clerkUser: {
        clerkId: "clerk_orphan",
        email: "orphan@test.com",
        name: "orphan",
      },
      conversationId: conversation.id,
      content: "hi",
      clientMessageId: "client-orphan-1",
      modelId: "openai:gpt-5-mini",
    });
    expect(retried.requestId).toBe(adopted.requestId);
  });

  it("resolves a unique violation from a concurrent retry by returning the existing bundle", async () => {
    const db = await createTestPersistenceDb();
    const { conversation } = await seedConversation(db, "race");

    const clerkUser = {
      clerkId: "clerk_race",
      email: "race@test.com",
      name: "race",
    };

    const winner = await createGenerationV2Repository(db).createRequest({
      clerkUser,
      conversationId: conversation.id,
      content: "Say hi",
      clientMessageId: "client-race-1",
      modelId: "openai:gpt-5-mini",
    });

    // Simulate the check-then-insert race: the retry's dedupe pre-check ran
    // before the winner committed, so its insert hits the unique index.
    let suppressedPreCheck = false;
    const raceDb = new Proxy(db, {
      get(target, prop, receiver) {
        if (prop === "query") {
          return new Proxy(target.query, {
            get(queryTarget, queryProp, queryReceiver) {
              if (queryProp === "messages") {
                const messagesQuery = Reflect.get(
                  queryTarget,
                  queryProp,
                  queryReceiver,
                );
                return new Proxy(messagesQuery, {
                  get(messagesTarget, messagesProp) {
                    if (messagesProp === "findFirst" && !suppressedPreCheck) {
                      return (..._args: unknown[]) => {
                        suppressedPreCheck = true;
                        return Promise.resolve(undefined);
                      };
                    }
                    return Reflect.get(messagesTarget, messagesProp);
                  },
                });
              }
              return Reflect.get(queryTarget, queryProp, queryReceiver);
            },
          });
        }
        return Reflect.get(target, prop, receiver);
      },
    }) as typeof db;

    const loser = await createGenerationV2Repository(raceDb).createRequest({
      clerkUser,
      conversationId: conversation.id,
      content: "Say hi",
      clientMessageId: "client-race-1",
      modelId: "openai:gpt-5-mini",
    });

    expect(loser.requestId).toBe(winner.requestId);
    expect(loser.userMessageId).toBe(winner.userMessageId);

    const userMessages = await db.query.messages.findMany({
      where: eq(messages.clientMessageId, "client-race-1"),
    });
    expect(userMessages).toHaveLength(1);
  });

  it("creates the request/message/session graph inside one database transaction", async () => {
    const db = await createTestPersistenceDb();
    const { conversation } = await seedConversation(db, "tx");
    const transaction = vi.fn(db.transaction.bind(db));
    const txDb = new Proxy(db, {
      get(target, prop, receiver) {
        if (prop === "transaction") {
          return transaction;
        }
        return Reflect.get(target, prop, receiver);
      },
    }) as typeof db;
    const repo = createGenerationV2Repository(txDb);

    await repo.createRequest({
      clerkUser: {
        clerkId: "clerk_tx",
        email: "tx@test.com",
        name: "tx",
      },
      conversationId: conversation.id,
      content: "Run transactionally",
      modelId: "openai:gpt-5-mini",
    });

    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
