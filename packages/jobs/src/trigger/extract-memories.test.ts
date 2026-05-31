import {
  createConversationRepository,
  createMessageRepository,
  createPreferenceRepository,
  createUserRepository,
} from "@blah-chat/persistence-postgres";
import { describe, expect, it, vi } from "vitest";
import { createTestPersistenceDb } from "../../../persistence-postgres/src/testing/pglite";
import { extractMemoriesForConversation } from "./extract-memories";

describe("extractMemoriesForConversation", () => {
  it("extracts memories from the active Postgres branch and avoids duplicates on rerun", async () => {
    const db = await createTestPersistenceDb();
    const users = createUserRepository(db);
    const conversations = createConversationRepository(db);
    const messages = createMessageRepository(db);
    const preferences = createPreferenceRepository(db);

    const user = await users.upsertFromClerk({
      clerkId: "clerk_memory_job",
      email: "memory-job@example.com",
      name: "Memory Job",
    });

    await preferences.setForUser(user.id, "memoryExtractionLevel", "moderate");

    const conversation = await conversations.create({
      userId: user.id,
      title: "Memory extraction",
      model: "openai:gpt-5",
    });

    const rootUser = await messages.create({
      conversationId: conversation.id,
      userId: user.id,
      role: "user",
      content:
        "User is building blah.chat with TypeScript and wants durable Postgres memory extraction. ".repeat(
          8,
        ),
      parentMessageIds: [],
      siblingIndex: 0,
    });

    await messages.create({
      conversationId: conversation.id,
      userId: user.id,
      role: "assistant",
      content:
        "Stale branch says the user prefers Rust and is moving away from TypeScript entirely. ".repeat(
          8,
        ),
      parentMessageIds: [rootUser.id],
      siblingIndex: 0,
    });

    const activeAssistant = await messages.create({
      conversationId: conversation.id,
      userId: user.id,
      role: "assistant",
      content:
        "Active branch confirms the user prefers TypeScript, Postgres, and durable background jobs. ".repeat(
          8,
        ),
      parentMessageIds: [rootUser.id],
      siblingIndex: 1,
    });

    await conversations.setActiveLeaf({
      conversationId: conversation.id,
      activeLeafMessageId: activeAssistant.id,
    });

    const generateStructuredMemories = vi.fn(
      async (input: {
        conversationText: string;
        existingMemoriesText: string;
        extractionLevel: string;
      }) => {
        expect(input.extractionLevel).toBe("moderate");
        expect(input.conversationText).toContain(
          "Active branch confirms the user prefers TypeScript",
        );
        expect(input.conversationText).not.toContain(
          "Stale branch says the user prefers Rust",
        );
        if (generateStructuredMemories.mock.calls.length <= 1) {
          expect(input.existingMemoriesText).toBe("");
        } else {
          expect(input.existingMemoriesText).toContain(
            "User prefers TypeScript and durable Postgres jobs",
          );
        }

        return {
          facts: [
            {
              content: "User prefers TypeScript and durable Postgres jobs",
              category: "project" as const,
              importance: 9,
              reasoning: "This is an active long-term project preference.",
              confidence: 0.96,
            },
          ],
        };
      },
    );

    const embedBatch = vi.fn(async (_values: string[]) => [[0.9, 0.1]]);

    const firstResult = await extractMemoriesForConversation(
      {
        conversationId: conversation.id,
      },
      {
        db,
        now: () => 123,
        generateStructuredMemories,
        embedBatch,
      },
    );

    expect(firstResult).toMatchObject({ extracted: 1 });
    const storedAfterFirstRun = await db.query.memoryEmbeddings.findMany({
      where: (table, { eq }) => eq(table.userId, user.id),
    });
    expect(storedAfterFirstRun).toHaveLength(1);
    expect(storedAfterFirstRun[0]).toMatchObject({
      conversationId: conversation.id,
      sourceMessageId: activeAssistant.id,
      content: "User prefers TypeScript and durable Postgres jobs",
      category: "project",
      searchDocument: "User prefers TypeScript and durable Postgres jobs",
    });
    expect(
      storedAfterFirstRun[0]?.metadata as
        | { verifiedBy?: string; confidence?: number; importance?: number }
        | undefined,
    ).toMatchObject({
      verifiedBy: "auto",
      confidence: 0.96,
      importance: 9,
    });

    const secondResult = await extractMemoriesForConversation(
      {
        conversationId: conversation.id,
      },
      {
        db,
        now: () => 456,
        generateStructuredMemories,
        embedBatch,
      },
    );

    expect(secondResult).toMatchObject({ extracted: 0 });
    const storedAfterSecondRun = await db.query.memoryEmbeddings.findMany({
      where: (table, { eq }) => eq(table.userId, user.id),
    });
    expect(storedAfterSecondRun).toHaveLength(1);
    expect(generateStructuredMemories).toHaveBeenCalledTimes(2);
    expect(embedBatch).toHaveBeenCalledTimes(2);
    expect(
      await db.query.memoryEmbeddings.findFirst({
        where: (table, { eq }) =>
          eq(table.id, storedAfterFirstRun[0]?.id ?? "__missing__"),
      }),
    ).toMatchObject(storedAfterFirstRun[0] ?? {});
  });

  it("does not extract memories for a conversation owned by another user", async () => {
    const db = await createTestPersistenceDb();
    const users = createUserRepository(db);
    const conversations = createConversationRepository(db);

    const owner = await users.upsertFromClerk({
      clerkId: "clerk_memory_owner",
      email: "memory-owner@example.com",
      name: "Memory Owner",
    });
    const other = await users.upsertFromClerk({
      clerkId: "clerk_memory_other",
      email: "memory-other@example.com",
      name: "Memory Other",
    });

    const conversation = await conversations.create({
      userId: owner.id,
      title: "Private memory extraction",
      model: "openai:gpt-5",
    });

    const generateStructuredMemories = vi.fn();
    const embedBatch = vi.fn();

    await expect(
      extractMemoriesForConversation(
        {
          conversationId: conversation.id,
          userId: other.id,
        },
        {
          db,
          generateStructuredMemories,
          embedBatch,
        },
      ),
    ).rejects.toThrow("Conversation not found");

    expect(generateStructuredMemories).not.toHaveBeenCalled();
    expect(embedBatch).not.toHaveBeenCalled();
  });
});
