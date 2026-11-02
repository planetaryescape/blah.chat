import { DEFAULT_MODEL_ID } from "@blah-chat/ai/models";
import { afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "../../__tests__/testSetup";
import { api } from "../_generated/api";
import {
  createMockIdentity,
  createTestConversationData,
  createTestMessageData,
  createTestUserData,
} from "../lib/test/factories";
import schema from "../schema";

async function fixture() {
  const t = convexTest(schema);
  const ids = await t.run(async (ctx) => {
    const owner = await ctx.db.insert(
      "users",
      createTestUserData({ clerkId: "owner" }),
    );
    const collaborator = await ctx.db.insert(
      "users",
      createTestUserData({ clerkId: "collaborator" }),
    );
    const outsider = await ctx.db.insert(
      "users",
      createTestUserData({ clerkId: "outsider" }),
    );
    const conversationId = await ctx.db.insert(
      "conversations",
      createTestConversationData(owner, { isCollaborative: true }),
    );
    const foreignConversationId = await ctx.db.insert(
      "conversations",
      createTestConversationData(outsider),
    );
    await ctx.db.insert("conversationParticipants", {
      conversationId,
      userId: collaborator,
      role: "collaborator",
      joinedAt: Date.now(),
    });
    const messageId = await ctx.db.insert(
      "messages",
      createTestMessageData(conversationId, owner),
    );
    const childId = await ctx.db.insert(
      "messages",
      createTestMessageData(conversationId, owner, {
        parentMessageId: messageId,
        siblingIndex: 0,
      }),
    );
    const foreignMessageId = await ctx.db.insert(
      "messages",
      createTestMessageData(foreignConversationId, outsider, {
        parentMessageId: messageId,
      }),
    );
    const storageId = await ctx.storage.store(new Blob(["private"]));
    await ctx.db.insert("files", {
      userId: owner,
      conversationId,
      storageId,
      name: "private.txt",
      mimeType: "text/plain",
      size: 7,
      createdAt: Date.now(),
    });
    await ctx.db.insert("attachments", {
      conversationId,
      userId: owner,
      messageId,
      storageId,
      type: "file",
      name: "private.txt",
      mimeType: "text/plain",
      size: 7,
      createdAt: Date.now(),
    });
    return {
      owner,
      collaborator,
      outsider,
      conversationId,
      foreignConversationId,
      messageId,
      childId,
      foreignMessageId,
      storageId,
    };
  });
  return { t, ...ids };
}

afterEach(() => vi.useRealTimers());

describe("conversation authorization boundaries", () => {
  it("never accepts a supplied Clerk ID as identity, and permits actual collaborators", async () => {
    const { t, conversationId } = await fixture();
    expect(
      await t.query(api.conversations.getWithClerkVerification, {
        conversationId,
        clerkId: "owner",
      }),
    ).toBeNull();
    expect(
      await t
        .withIdentity(createMockIdentity({ subject: "outsider" }))
        .query(api.conversations.getWithClerkVerification, {
          conversationId,
          clerkId: "owner",
        }),
    ).toBeNull();
    expect(
      await t
        .withIdentity(createMockIdentity({ subject: "owner" }))
        .query(api.conversations.getWithClerkVerification, {
          conversationId,
          clerkId: "owner",
        }),
    ).not.toBeNull();
    expect(
      await t
        .withIdentity(createMockIdentity({ subject: "collaborator" }))
        .query(api.conversations.getWithClerkVerification, {
          conversationId,
          clerkId: "collaborator",
        }),
    ).not.toBeNull();
  });

  it("denies anonymous/foreign metadata, attachments, branches and siblings; rejects mixed IDs", async () => {
    const { t, messageId, foreignMessageId, conversationId, childId } =
      await fixture();
    for (const client of [
      t,
      t.withIdentity(createMockIdentity({ subject: "outsider" })),
    ]) {
      expect(
        await client.query(api.messages.batchGetMetadata, {
          messageIds: [messageId],
        }),
      ).toEqual({ attachments: [], toolCalls: [], sources: [] });
      expect(
        await client.query(api.messages.getAttachments, { messageId }),
      ).toEqual([]);
      expect(
        await client.query(api.messages.getBranchesAtMessage, { messageId }),
      ).toEqual([]);
      expect(
        await client.query(api.messages.getSiblings, { messageId: childId }),
      ).toEqual([]);
      expect(
        (await client.query(api.messages.getBranchInfo, { conversationId }))
          .totalMessages,
      ).toBe(0);
    }
    for (const subject of ["owner", "collaborator"]) {
      const client = t.withIdentity(createMockIdentity({ subject }));
      expect(
        (
          await client.query(api.messages.batchGetMetadata, {
            messageIds: [messageId],
          })
        ).attachments,
      ).toHaveLength(1);
      expect(
        await client.query(api.messages.batchGetMetadata, {
          messageIds: [messageId, foreignMessageId],
        }),
      ).toEqual({ attachments: [], toolCalls: [], sources: [] });
      expect(
        await client.query(api.messages.getAttachments, { messageId }),
      ).toHaveLength(1);
      expect(
        (
          await client.query(api.messages.getBranchesAtMessage, { messageId })
        ).map((m) => m._id),
      ).toEqual([childId]);
      expect(
        (
          await client.query(api.messages.getSiblings, { messageId: childId })
        ).map((m) => m._id),
      ).toEqual([childId]);
    }
  });

  it("rejects send before creating messages or jobs for non-members", async () => {
    vi.useFakeTimers();
    const { t, conversationId } = await fixture();
    const outsider = t.withIdentity(
      createMockIdentity({ subject: "outsider" }),
    );
    await expect(
      outsider.mutation(api.chat.sendMessage, {
        conversationId,
        content: "injected",
        modelId: "openai:gpt-oss-20b",
      }),
    ).rejects.toThrow(/unauthorized/);
    const data = await t.run(async (ctx) => ({
      messages: await ctx.db.query("messages").collect(),
      jobs: await ctx.db.system.query("_scheduled_functions").collect(),
    }));
    expect(data.messages).toHaveLength(3);
    expect(data.jobs).toHaveLength(0);
  });

  it("allows owner and collaborator send/compare without granting a non-member the collaborative flag", async () => {
    vi.useFakeTimers();
    for (const subject of ["owner", "collaborator"]) {
      const { t, conversationId } = await fixture();
      const result = await t
        .withIdentity(createMockIdentity({ subject }))
        .mutation(api.chat.sendMessage, {
          conversationId,
          content: "hello",
          models: ["openai:gpt-oss-20b", DEFAULT_MODEL_ID],
        });
      expect(result.conversationId).toBe(conversationId);
      expect(result.assistantMessageIds).toHaveLength(2);
    }
  });

  it("requires recorded upload ownership and conversation access, without allowing storage ID claims", async () => {
    const { t, storageId, conversationId, foreignConversationId } =
      await fixture();
    const owner = t.withIdentity(createMockIdentity({ subject: "owner" }));
    const outsider = t.withIdentity(
      createMockIdentity({ subject: "outsider" }),
    );
    expect(await t.query(api.storage.getUrl, { storageId })).toBeNull();
    expect(await outsider.query(api.storage.getUrl, { storageId })).toBeNull();
    expect(await owner.query(api.storage.getUrl, { storageId })).toContain(
      "https://",
    );
    const args = {
      storageId,
      conversationId,
      name: "image.png",
      mimeType: "image/png",
      size: 7,
    };
    await expect(outsider.mutation(api.files.saveFile, args)).rejects.toThrow(
      /unauthorized/,
    );
    await expect(
      owner.mutation(api.files.saveFile, {
        ...args,
        conversationId: foreignConversationId,
      }),
    ).rejects.toThrow(/unauthorized/);
    const unknownStorageId = await t.run((ctx) =>
      ctx.storage.store(new Blob(["unclaimed"])),
    );
    await expect(
      owner.mutation(api.files.saveFile, {
        ...args,
        storageId: unknownStorageId,
        size: 9,
      }),
    ).rejects.toThrow(/unauthorized/);
    expect(await owner.mutation(api.files.saveFile, args)).toBeTruthy();
  });
});

describe("public sharing fails closed for protected content", () => {
  it("does not unlock protected note content by note ID or a verify boolean", async () => {
    const { t, owner } = await fixture();
    const notes = await t.run(async (ctx) => {
      const base = {
        userId: owner,
        title: "note",
        content: "private content",
        htmlContent: "<p>private content</p>",
        isPinned: false,
        isPublic: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      return {
        protected: await ctx.db.insert("notes", {
          ...base,
          shareId: "protected-note",
          sharePassword: "hash",
        }),
        open: await ctx.db.insert("notes", { ...base, shareId: "open-note" }),
        expired: await ctx.db.insert("notes", {
          ...base,
          shareExpiresAt: Date.now() - 1,
        }),
      };
    });
    expect(
      await t.query(api.notes.getPublicNote, { noteId: notes.protected }),
    ).toBeNull();
    await expect(
      t.action(api.notes.verifyShare, {
        noteId: notes.protected,
        password: "anything",
      }),
    ).rejects.toThrow(/temporarily unavailable/);
    expect(
      (await t.query(api.notes.getPublicNote, { noteId: notes.open }))?.content,
    ).toBe("private content");
    expect(
      await t.query(api.notes.getPublicNote, { noteId: notes.expired }),
    ).toBeNull();
  });

  it("keeps unprotected reads while denying protected reads and both fork modes", async () => {
    const { t, conversationId, owner } = await fixture();
    await t.run(async (ctx) => {
      for (const [shareId, password] of [
        ["open", undefined],
        ["protected", "hash"],
      ] as const)
        await ctx.db.insert("shares", {
          conversationId,
          userId: owner,
          shareId,
          title: "shared",
          password,
          isPublic: true,
          isActive: true,
          anonymizeUsernames: false,
          viewCount: 0,
          createdAt: Date.now(),
        });
    });
    expect(
      await t.query(api.shares.getSharedConversation, { shareId: "protected" }),
    ).toBeNull();
    expect(
      await t.query(api.shares.getSharedMessages, { shareId: "protected" }),
    ).toBeNull();
    expect(
      await t.query(api.shares.getSharedConversation, { shareId: "open" }),
    ).not.toBeNull();
    expect(
      await t.query(api.shares.getSharedMessages, { shareId: "open" }),
    ).toHaveLength(2);
    const outsider = t.withIdentity(
      createMockIdentity({ subject: "outsider" }),
    );
    await expect(
      outsider.action(api.shares.forkPrivate, { shareId: "protected" }),
    ).rejects.toThrow(/protected/);
    await expect(
      outsider.action(api.shares.forkCollaborative, { shareId: "protected" }),
    ).rejects.toThrow(/protected/);
  });
});
