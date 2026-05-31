import {
  attachments,
  createConversationRepository,
  createMessageRepository,
  createUserRepository,
} from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createTestPersistenceDb } from "../../../persistence-postgres/src/testing/pglite";
import { generateImageForMessage } from "./generate-image";

async function createImageConversationFixture(input: {
  clerkId: string;
  email: string;
  name: string;
  title: string;
}) {
  const db = await createTestPersistenceDb();
  const users = createUserRepository(db);
  const conversations = createConversationRepository(db);
  const messages = createMessageRepository(db);

  const user = await users.upsertFromClerk({
    clerkId: input.clerkId,
    email: input.email,
    name: input.name,
  });

  const conversation = await conversations.create({
    userId: user.id,
    title: input.title,
    model: "google:gemini-3-pro-image-preview",
  });

  const assistantMessage = await messages.create({
    conversationId: conversation.id,
    userId: user.id,
    role: "assistant",
    content: "",
    status: "pending",
    model: "google:gemini-3-pro-image-preview",
    parentMessageIds: [],
    siblingIndex: 0,
  });

  return { assistantMessage, conversation, db, user };
}

describe("generateImageForMessage", () => {
  it("stores generated image bytes in R2 and persists Postgres attachment metadata", async () => {
    const db = await createTestPersistenceDb();
    const users = createUserRepository(db);
    const conversations = createConversationRepository(db);
    const messages = createMessageRepository(db);

    const user = await users.upsertFromClerk({
      clerkId: "clerk_image_job",
      email: "image-job@example.com",
      name: "Image Job",
    });

    const conversation = await conversations.create({
      userId: user.id,
      title: "Image generation",
      model: "google:gemini-3-pro-image-preview",
    });

    const assistantMessage = await messages.create({
      conversationId: conversation.id,
      userId: user.id,
      role: "assistant",
      content: "",
      status: "pending",
      model: "google:gemini-3-pro-image-preview",
      parentMessageIds: [],
      siblingIndex: 0,
    });

    const uploaded: Array<{
      bucket: string;
      key: string;
      contentType: string;
      body: Uint8Array;
    }> = [];

    const result = await generateImageForMessage(
      {
        userId: user.id,
        conversationId: conversation.id,
        messageId: assistantMessage.id,
        prompt: "A repair bot rebuilding the storage layer",
        model: "google:gemini-3-pro-image-preview",
        thinkingEffort: "medium",
      },
      {
        db,
        now: () => 123,
        bucket: "blah-chat-test",
        createImage: async () => ({
          bytes: new Uint8Array([1, 2, 3, 4]),
          mimeType: "image/png",
          usage: {
            inputTokens: 10,
            outputTokens: 20,
            reasoningTokens: 5,
          },
          reasoning: "Reason about layout first.",
        }),
        uploadImage: async (input) => {
          uploaded.push(input);
        },
      },
    );

    expect(result.success).toBe(true);
    expect(uploaded).toHaveLength(1);
    expect(uploaded[0]).toMatchObject({
      bucket: "blah-chat-test",
      key: expect.stringContaining(
        `/conversations/${conversation.id}/messages/${assistantMessage.id}/generated/`,
      ),
      contentType: "image/png",
      body: new Uint8Array([1, 2, 3, 4]),
    });

    const storedAttachment = await db.query.attachments.findFirst({
      where: eq(attachments.messageId, assistantMessage.id),
    });
    expect(storedAttachment).toMatchObject({
      conversationId: conversation.id,
      userId: user.id,
      type: "image",
      key: uploaded[0]?.key,
      name: "generated-image.png",
      mimeType: "image/png",
      size: 4,
      metadata: {
        prompt: "A repair bot rebuilding the storage layer",
        model: "google:gemini-3-pro-image-preview",
      },
      createdAt: 123,
    });

    const updatedMessage = await db.query.messages.findFirst({
      where: (table, { eq: tableEq }) => tableEq(table.id, assistantMessage.id),
    });
    expect(updatedMessage).toMatchObject({
      id: assistantMessage.id,
      status: "complete",
      content: "Generated image: A repair bot rebuilding the storage layer",
      model: "google:gemini-3-pro-image-preview",
      updatedAt: 123,
    });

    const usageRecord = await db.query.usageRecords.findFirst({
      where: (table, { eq: tableEq }) =>
        tableEq(table.conversationId, conversation.id),
    });
    expect(usageRecord).toMatchObject({
      userId: user.id,
      conversationId: conversation.id,
      model: "google:gemini-3-pro-image-preview",
      feature: "chat",
      operationType: "image",
      inputTokens: 0,
      outputTokens: 0,
      cost: expect.any(Number),
      messageCount: 1,
    });
  });

  it("does not generate or upload images for a conversation owned by another user", async () => {
    const db = await createTestPersistenceDb();
    const users = createUserRepository(db);
    const conversations = createConversationRepository(db);
    const messages = createMessageRepository(db);

    const owner = await users.upsertFromClerk({
      clerkId: "clerk_image_owner",
      email: "image-owner@example.com",
      name: "Image Owner",
    });
    const other = await users.upsertFromClerk({
      clerkId: "clerk_image_other",
      email: "image-other@example.com",
      name: "Image Other",
    });

    const conversation = await conversations.create({
      userId: owner.id,
      title: "Private image generation",
      model: "google:gemini-3-pro-image-preview",
    });

    const assistantMessage = await messages.create({
      conversationId: conversation.id,
      userId: owner.id,
      role: "assistant",
      content: "",
      status: "pending",
      model: "google:gemini-3-pro-image-preview",
      parentMessageIds: [],
      siblingIndex: 0,
    });

    const createImage = vi.fn(async () => ({
      bytes: new Uint8Array([1, 2, 3, 4]),
      mimeType: "image/png",
    }));
    const uploadImage = vi.fn();

    const result = await generateImageForMessage(
      {
        userId: other.id,
        conversationId: conversation.id,
        messageId: assistantMessage.id,
        prompt: "A private image",
      },
      {
        db,
        bucket: "blah-chat-test",
        createImage,
        uploadImage,
      },
    );

    expect(result).toEqual({ success: true, skipped: "unauthorized" });
    expect(createImage).not.toHaveBeenCalled();
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it("does not load reference images outside the conversation owner's storage", async () => {
    const { assistantMessage, conversation, db, user } =
      await createImageConversationFixture({
        clerkId: "clerk_image_ref",
        email: "image-ref@example.com",
        name: "Image Ref",
        title: "Reference image",
      });

    const loadReferenceImage = vi.fn(async () => "data:image/png;base64,aW1n");
    const createImage = vi.fn(async () => ({
      bytes: new Uint8Array([1, 2, 3, 4]),
      mimeType: "image/png",
    }));
    const uploadImage = vi.fn();

    const result = await generateImageForMessage(
      {
        userId: user.id,
        conversationId: conversation.id,
        messageId: assistantMessage.id,
        prompt: "Use a reference image",
        referenceImageStorageId: "users/other_user/drafts/private.png",
      },
      {
        db,
        bucket: "blah-chat-test",
        loadReferenceImage,
        createImage,
        uploadImage,
      },
    );

    expect(result).toEqual({
      success: true,
      skipped: "reference_image_not_found",
    });
    expect(loadReferenceImage).not.toHaveBeenCalled();
    expect(createImage).not.toHaveBeenCalled();
    expect(uploadImage).not.toHaveBeenCalled();
  });
});
