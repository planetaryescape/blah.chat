import {
  attachments,
  createAttachmentRepository,
  createConversationRepository,
  createMessageRepository,
  createUserRepository,
  fileChunks,
} from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createTestPersistenceDb } from "../../../persistence-postgres/src/testing/pglite";
import { embedAttachmentFile } from "./embed-file";

describe("embedAttachmentFile", () => {
  it("chunks extracted attachment text and stores Postgres file chunk embeddings", async () => {
    const db = await createTestPersistenceDb();
    const users = createUserRepository(db);
    const conversations = createConversationRepository(db);
    const messages = createMessageRepository(db);
    const attachmentRepo = createAttachmentRepository(db);

    const user = await users.upsertFromClerk({
      clerkId: "clerk_embed_file",
      email: "embed-file@example.com",
      name: "Embed File",
    });

    const conversation = await conversations.create({
      userId: user.id,
      title: "Embedded attachment",
      model: "openai:gpt-5-mini",
    });

    const message = await messages.create({
      conversationId: conversation.id,
      userId: user.id,
      role: "user",
      content: "Use the attached file for retrieval.",
      parentMessageIds: [],
      siblingIndex: 0,
    });

    const attachment = await attachmentRepo.create({
      messageId: message.id,
      conversationId: conversation.id,
      userId: user.id,
      type: "file",
      key: "users/u/conversations/c/retrieval.txt",
      bucket: "blah-chat-test",
      name: "retrieval.txt",
      mimeType: "text/plain",
      size: 128,
    });

    await db
      .update(attachments)
      .set({
        extractedText:
          "This attachment should be chunked and embedded for Postgres retrieval.",
        extractedAt: 99,
      })
      .where(eq(attachments.id, attachment.id));

    const result = await embedAttachmentFile(
      {
        attachmentId: attachment.id,
      },
      {
        db,
        now: () => 123,
        embedBatch: async (values) => values.map(() => [0.1, 0.2, 0.3]),
      },
    );

    expect(result).toMatchObject({
      success: true,
      chunkCount: 1,
    });

    const storedChunks = await db.query.fileChunks.findMany({
      where: eq(fileChunks.attachmentId, attachment.id),
    });

    expect(storedChunks).toHaveLength(1);
    expect(storedChunks[0]).toMatchObject({
      attachmentId: attachment.id,
      conversationId: conversation.id,
      userId: user.id,
      chunkIndex: 0,
      embedding: [0.1, 0.2, 0.3],
    });
    expect(storedChunks[0]?.content).toContain(
      "chunked and embedded for Postgres retrieval",
    );
  });
});
