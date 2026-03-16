/**
 * @vitest-environment node
 */
import {
  conversations as conversationsTable,
  createConversationRepository,
  createUserRepository,
  messages,
} from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createTestPersistenceDb } from "../../../../../../packages/persistence-postgres/src/testing/pglite";
import { compactConversation } from "../compaction";

describe("compactConversation", () => {
  it("summarizes a conversation into a new conversation with a recap message", async () => {
    const db = await createTestPersistenceDb();
    const users = createUserRepository(db);
    const conversations = createConversationRepository(db);
    const user = await users.upsertFromClerk({
      clerkId: "user_compact",
      email: "compact@example.com",
      name: "Compact User",
    });
    const conversation = await conversations.create({
      userId: user.id,
      title: "Long Chat",
      model: "openai:gpt-5-mini",
    });

    await db.insert(messages).values([
      {
        id: "msg_1",
        conversationId: conversation.id,
        userId: user.id,
        role: "user",
        content: "We discussed project scope",
        status: "complete",
        rootMessageId: "msg_1",
        siblingIndex: 0,
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: "msg_2",
        conversationId: conversation.id,
        userId: user.id,
        role: "assistant",
        content: "Scope includes auth and billing",
        status: "complete",
        model: "openai:gpt-5-mini",
        rootMessageId: "msg_1",
        siblingIndex: 0,
        createdAt: 2,
        updatedAt: 2,
      },
      {
        id: "msg_3",
        conversationId: conversation.id,
        userId: user.id,
        role: "user",
        content: "We also need search",
        status: "complete",
        rootMessageId: "msg_3",
        siblingIndex: 1,
        createdAt: 3,
        updatedAt: 3,
      },
    ]);

    const compacted = await compactConversation({
      db,
      userId: user.id,
      conversationId: conversation.id,
      summarize: async () => ({
        text: "Project scope covers auth, billing, and search.",
      }),
    });

    const newConversation = await db.query.conversations.findFirst({
      where: eq(conversationsTable.id, compacted.conversationId),
    });
    const compactedMessages = await db.query.messages.findMany({
      where: eq(messages.conversationId, compacted.conversationId),
    });

    expect(compacted.conversationId).not.toBe(conversation.id);
    expect(newConversation?.activeLeafMessageId).toBe(compacted.messageId);
    expect(compactedMessages).toHaveLength(1);
    expect(compactedMessages[0]?.content).toContain(
      "Project scope covers auth, billing, and search.",
    );
  });
});
