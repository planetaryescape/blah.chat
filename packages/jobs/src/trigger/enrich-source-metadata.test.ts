import {
  createConversationRepository,
  createMessageRepository,
  createUserRepository,
  messageSources,
  sourceMetadata,
} from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createTestPersistenceDb } from "../../../persistence-postgres/src/testing/pglite";
import { enrichMessageSourcesMetadata } from "./enrich-source-metadata";

describe("enrichMessageSourcesMetadata", () => {
  it("creates Postgres source rows and enriches metadata for message citations", async () => {
    const db = await createTestPersistenceDb();
    const users = createUserRepository(db);
    const conversations = createConversationRepository(db);
    const messages = createMessageRepository(db);

    const user = await users.upsertFromClerk({
      clerkId: "clerk_source_enrich",
      email: "source-enrich@example.com",
      name: "Source Enrich",
    });

    const conversation = await conversations.create({
      userId: user.id,
      title: "Sources",
      model: "openai:gpt-5-mini",
    });

    const message = await messages.create({
      conversationId: conversation.id,
      userId: user.id,
      role: "assistant",
      content: "Here are the citations.",
      parentMessageIds: [],
      siblingIndex: 0,
    });

    const result = await enrichMessageSourcesMetadata(
      {
        messageId: message.id,
        sourceUrls: ["https://example.com/story"],
      },
      {
        db,
        now: () => 123,
        fetchMetadata: async () => ({
          title: "Example Story",
          description: "Story description",
          image: "https://example.com/og.png",
          favicon: "https://example.com/favicon.ico",
          siteName: "Example",
        }),
      },
    );

    expect(result).toMatchObject({
      success: true,
      enriched: 1,
    });

    const storedSource = await db.query.messageSources.findFirst({
      where: eq(messageSources.messageId, message.id),
    });
    const storedMetadata = await db.query.sourceMetadata.findFirst({
      where: eq(sourceMetadata.url, "https://example.com/story"),
    });

    expect(storedSource).toMatchObject({
      messageId: message.id,
      conversationId: conversation.id,
      userId: user.id,
      position: 1,
      title: "Example Story",
      url: "https://example.com/story",
    });
    expect(storedMetadata).toMatchObject({
      url: "https://example.com/story",
      title: "Example Story",
      description: "Story description",
      ogImage: "https://example.com/og.png",
      favicon: "https://example.com/favicon.ico",
      siteName: "Example",
      enriched: true,
    });
  });
});
