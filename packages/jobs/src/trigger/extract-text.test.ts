import {
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
import { extractTextForAttachment } from "./extract-text";

describe("extractTextForAttachment", () => {
  it("downloads an attachment from the Postgres path and persists extracted text", async () => {
    const db = await createTestPersistenceDb();
    const users = createUserRepository(db);
    const conversations = createConversationRepository(db);
    const messages = createMessageRepository(db);
    const attachments = createAttachmentRepository(db);

    const user = await users.upsertFromClerk({
      clerkId: "clerk_extract_job",
      email: "extract-job@example.com",
      name: "Extract Job",
    });

    const conversation = await conversations.create({
      userId: user.id,
      title: "Attachment extraction",
      model: "openai:gpt-5-mini",
    });

    const message = await messages.create({
      conversationId: conversation.id,
      userId: user.id,
      role: "user",
      content: "Index the attached note",
      parentMessageIds: [],
      siblingIndex: 0,
    });

    const attachment = await attachments.create({
      messageId: message.id,
      conversationId: conversation.id,
      userId: user.id,
      type: "file",
      key: "users/user_1/conversations/conv_1/notes.txt",
      bucket: "blah-chat-test",
      name: "notes.txt",
      mimeType: "text/plain",
      size: 128,
    });

    const result = await extractTextForAttachment(
      {
        attachmentId: attachment.id,
        storageId: attachment.key,
        fileName: attachment.name,
        mimeType: attachment.mimeType,
      },
      {
        db,
        now: () => 123,
        downloadAttachment: async () =>
          new Blob([
            "Postgres attachments should be extracted in background jobs.",
          ]),
        embedAttachment: async () => {},
      },
    );

    expect(result).toMatchObject({
      success: true,
      extractedText:
        "Postgres attachments should be extracted in background jobs.",
    });
    expect(
      await db.query.attachments.findFirst({
        where: (table, { eq }) => eq(table.id, attachment.id),
      }),
    ).toMatchObject({
      id: attachment.id,
      extractedText:
        "Postgres attachments should be extracted in background jobs.",
      extractedAt: 123,
      extractionError: null,
    });
  });

  it("chains attachment embedding after extraction on the Postgres job path", async () => {
    const db = await createTestPersistenceDb();
    const users = createUserRepository(db);
    const conversations = createConversationRepository(db);
    const messages = createMessageRepository(db);
    const attachments = createAttachmentRepository(db);

    const user = await users.upsertFromClerk({
      clerkId: "clerk_extract_embed_job",
      email: "extract-embed-job@example.com",
      name: "Extract Embed Job",
    });

    const conversation = await conversations.create({
      userId: user.id,
      title: "Attachment extraction",
      model: "openai:gpt-5-mini",
    });

    const message = await messages.create({
      conversationId: conversation.id,
      userId: user.id,
      role: "user",
      content: "Index the attached note",
      parentMessageIds: [],
      siblingIndex: 0,
    });

    const attachment = await attachments.create({
      messageId: message.id,
      conversationId: conversation.id,
      userId: user.id,
      type: "file",
      key: "users/user_1/conversations/conv_1/notes.txt",
      bucket: "blah-chat-test",
      name: "notes.txt",
      mimeType: "text/plain",
      size: 128,
    });

    await extractTextForAttachment(
      {
        attachmentId: attachment.id,
        storageId: attachment.key,
        fileName: attachment.name,
        mimeType: attachment.mimeType,
      },
      {
        db,
        now: () => 456,
        downloadAttachment: async () =>
          new Blob([
            "Chunk this extracted text into the attachment embedding store.",
          ]),
        embedAttachment: async ({ attachmentId }) => {
          await embedAttachmentFile(
            { attachmentId },
            {
              db,
              now: () => 456,
              embedBatch: async (values) => values.map(() => [0.1, 0.2, 0.3]),
            },
          );
        },
      },
    );

    const chunks = await db.query.fileChunks.findMany({
      where: eq(fileChunks.attachmentId, attachment.id),
    });

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({
      attachmentId: attachment.id,
      conversationId: conversation.id,
      userId: user.id,
      embedding: [0.1, 0.2, 0.3],
    });
    expect(chunks[0]?.content).toContain("attachment embedding store");
  });
});
