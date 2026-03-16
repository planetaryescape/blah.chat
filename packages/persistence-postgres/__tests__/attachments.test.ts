import { createR2Client } from "../src/clients/r2";
import { createAttachmentRepository } from "../src/repositories/attachments";
import { createConversationRepository } from "../src/repositories/conversations";
import { createMessageRepository } from "../src/repositories/messages";
import { createUserRepository } from "../src/repositories/users";
import {
  buildAttachmentObjectKey,
  createSignedReadUrl,
  createSignedUploadUrl,
} from "../src/storage";
import { createTestPersistenceDb } from "../src/testing/pglite";

describe("attachment storage", () => {
  test("builds stable object keys and signs upload/read URLs", async () => {
    const key = buildAttachmentObjectKey({
      userId: "user_1",
      conversationId: "conv_1",
      messageId: "msg_1",
      fileName: "Quarterly Report 2026.pdf",
    });
    const client = createR2Client({
      r2: {
        accountId: "account123",
        accessKeyId: "key",
        secretAccessKey: "secret",
        bucket: "blah-chat-prod",
        endpoint: "https://account123.r2.cloudflarestorage.com",
        region: "auto",
        forcePathStyle: false,
      },
    });

    const uploadUrl = await createSignedUploadUrl({
      client,
      bucket: "blah-chat-prod",
      key,
      contentType: "application/pdf",
      expiresIn: 60,
    });
    const readUrl = await createSignedReadUrl({
      client,
      bucket: "blah-chat-prod",
      key,
      expiresIn: 60,
    });

    expect(key).toBe(
      "users/user_1/conversations/conv_1/messages/msg_1/Quarterly-Report-2026.pdf",
    );
    expect(uploadUrl).toContain("blah-chat-prod");
    expect(uploadUrl).toContain("Quarterly-Report-2026.pdf");
    expect(readUrl).toContain("X-Amz-Signature");
  });

  test("persists attachment metadata against a message", async () => {
    const db = await createTestPersistenceDb();
    const users = createUserRepository(db);
    const conversations = createConversationRepository(db);
    const messages = createMessageRepository(db);
    const attachments = createAttachmentRepository(db);
    const user = await users.upsertFromClerk({
      clerkId: "user_attach",
      email: "attach@example.com",
      name: "Attach User",
    });
    const conversation = await conversations.create({
      userId: user.id,
      title: "Attachment Chat",
      model: "auto",
    });
    const message = await messages.create({
      conversationId: conversation.id,
      userId: user.id,
      role: "user",
      content: "See attached",
      parentMessageIds: [],
      siblingIndex: 0,
    });

    const created = await attachments.create({
      messageId: message.id,
      conversationId: conversation.id,
      userId: user.id,
      type: "file",
      bucket: "blah-chat-prod",
      key: "users/user_attach/conversations/attachment/report.pdf",
      name: "report.pdf",
      mimeType: "application/pdf",
      size: 42_000,
    });
    const listed = await attachments.listByMessage({
      messageId: message.id,
      conversationId: conversation.id,
    });

    expect(created.bucket).toBe("blah-chat-prod");
    expect(listed).toHaveLength(1);
    expect(listed[0]?.key).toContain("report.pdf");
  });
});
