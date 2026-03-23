import {
  createConversationRepository,
  createMessageRepository,
  createUserRepository,
} from "@blah-chat/persistence-postgres";
import { describe, expect, it, vi } from "vitest";
import { createTestPersistenceDb } from "../../../persistence-postgres/src/testing/pglite";
import { generateTitleForConversation } from "./generate-title";

describe("generateTitleForConversation", () => {
  it("generates a title from the active Postgres branch and persists it", async () => {
    const db = await createTestPersistenceDb();
    const users = createUserRepository(db);
    const conversations = createConversationRepository(db);
    const messages = createMessageRepository(db);

    const user = await users.upsertFromClerk({
      clerkId: "clerk_title_job",
      email: "title-job@example.com",
      name: "Title Job",
    });

    const conversation = await conversations.create({
      userId: user.id,
      title: "New Chat",
      model: "openai:gpt-5",
    });

    const rootUser = await messages.create({
      conversationId: conversation.id,
      userId: user.id,
      role: "user",
      content:
        "Need help finishing the Postgres rewrite and replacing Convex bridge tasks.",
      parentMessageIds: [],
      siblingIndex: 0,
    });

    await messages.create({
      conversationId: conversation.id,
      userId: user.id,
      role: "assistant",
      content: "Stale branch about migrating everything to SQLite instead.",
      parentMessageIds: [rootUser.id],
      siblingIndex: 0,
    });

    const activeAssistant = await messages.create({
      conversationId: conversation.id,
      userId: user.id,
      role: "assistant",
      content:
        "Active branch confirms the work is about Trigger jobs and Postgres routing.",
      parentMessageIds: [rootUser.id],
      siblingIndex: 1,
    });

    await conversations.setActiveLeaf({
      conversationId: conversation.id,
      activeLeafMessageId: activeAssistant.id,
    });

    const generateTitleText = vi.fn(
      async (input: { conversationText: string }) => {
        expect(input.conversationText).toContain(
          "Need help finishing the Postgres rewrite",
        );
        expect(input.conversationText).toContain(
          "Active branch confirms the work is about Trigger jobs and Postgres routing.",
        );
        expect(input.conversationText).not.toContain(
          "Stale branch about migrating everything to SQLite instead.",
        );

        return {
          text: "Postgres Trigger Rewrite",
        };
      },
    );

    const result = await generateTitleForConversation(
      { conversationId: conversation.id },
      {
        db,
        generateTitleText,
      },
    );

    expect(result).toMatchObject({
      success: true,
      title: "Postgres Trigger Rewrite",
    });
    expect(generateTitleText).toHaveBeenCalledTimes(1);
    expect(
      await db.query.conversations.findFirst({
        where: (table, { eq }) => eq(table.id, conversation.id),
      }),
    ).toMatchObject({
      id: conversation.id,
      title: "Postgres Trigger Rewrite",
    });
  });
});
