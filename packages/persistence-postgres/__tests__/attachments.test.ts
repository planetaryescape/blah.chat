import { beforeEach, describe, expect, test, vi } from "vitest";
import { createR2Client } from "../src/clients/r2";
import { createAttachmentRepository } from "../src/repositories/attachments";
import { createConversationRepository } from "../src/repositories/conversations";
import { createMessageRepository } from "../src/repositories/messages";
import { createTtsCacheRepository } from "../src/repositories/tts-cache";
import { createUserRepository } from "../src/repositories/users";
import {
  buildAttachmentObjectKey,
  buildCodeExecutionObjectKey,
  buildDraftObjectKey,
  buildGeneratedAttachmentObjectKey,
  buildTtsCacheObjectKey,
  createSignedReadUrl,
  createSignedUploadUrl,
  uploadObject,
} from "../src/storage";
import { createTestPersistenceDb } from "../src/testing/pglite";

describe("attachment storage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "123e4567-e89b-12d3-a456-426614174000",
    );
  });

  test("builds unique object keys and signs upload/read URLs", async () => {
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
      "users/user_1/conversations/conv_1/messages/msg_1/123e4567-e89b-12d3-a456-426614174000-Quarterly-Report-2026.pdf",
    );
    expect(uploadUrl).toContain("blah-chat-prod");
    expect(uploadUrl).toContain("Quarterly-Report-2026.pdf");
    expect(readUrl).toContain("X-Amz-Signature");
  });

  test("builds unique draft keys", () => {
    const key = buildDraftObjectKey({
      userId: "user_1",
      fileName: "voice note.webm",
    });

    expect(key).toBe(
      "users/user_1/drafts/123e4567-e89b-12d3-a456-426614174000-voice-note.webm",
    );
  });

  test("builds generated attachment, code execution, and TTS cache keys", () => {
    const generatedKey = buildGeneratedAttachmentObjectKey({
      userId: "user_1",
      conversationId: "conv_1",
      messageId: "msg_1",
      fileName: "generated image.png",
    });
    const codeExecutionKey = buildCodeExecutionObjectKey({
      userId: "user_1",
      conversationId: "conv_1",
      fileName: "plot.png",
    });
    const ttsKey = buildTtsCacheObjectKey({
      hash: "hash_123",
      format: "mp3",
    });

    expect(generatedKey).toBe(
      "users/user_1/conversations/conv_1/messages/msg_1/generated/123e4567-e89b-12d3-a456-426614174000-generated-image.png",
    );
    expect(codeExecutionKey).toBe(
      "users/user_1/conversations/conv_1/tool-outputs/code-execution/123e4567-e89b-12d3-a456-426614174000-plot.png",
    );
    expect(ttsKey).toBe("cache/tts/hash_123.mp3");
  });

  test("uploads bytes directly to R2", async () => {
    const send = vi.fn().mockResolvedValue({});
    const client = { send } as unknown as ReturnType<typeof createR2Client>;

    await uploadObject({
      client,
      bucket: "blah-chat-prod",
      key: "users/user_1/drafts/upload.bin",
      body: new Uint8Array([1, 2, 3]),
      contentType: "application/octet-stream",
    });

    expect(send).toHaveBeenCalledTimes(1);
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
      metadata: {
        prompt: "Summarize this image",
        width: 1024,
      },
    });
    const listed = await attachments.listByMessage({
      messageId: message.id,
      conversationId: conversation.id,
    });

    expect(created.bucket).toBe("blah-chat-prod");
    expect(created.metadata).toEqual({
      prompt: "Summarize this image",
      width: 1024,
    });
    expect(listed).toHaveLength(1);
    expect(listed[0]?.key).toContain("report.pdf");
    expect(listed[0]?.metadata).toEqual({
      prompt: "Summarize this image",
      width: 1024,
    });
  });

  test("stores and updates TTS cache rows", async () => {
    const db = await createTestPersistenceDb();
    const repo = createTtsCacheRepository(db);

    const created = await repo.upsert({
      hash: "hash_123",
      bucket: "blah-chat-prod",
      key: "cache/tts/hash_123.mp3",
      text: "Hello world",
      voice: "aura-asteria-en",
      speed: 1,
      format: "mp3",
    });
    const fetched = await repo.getByHash("hash_123");

    expect(created.bucket).toBe("blah-chat-prod");
    expect(created.key).toBe("cache/tts/hash_123.mp3");
    expect(fetched?.hash).toBe("hash_123");
    expect(fetched?.lastAccessedAt).toBeGreaterThanOrEqual(created.createdAt);
  });
});
