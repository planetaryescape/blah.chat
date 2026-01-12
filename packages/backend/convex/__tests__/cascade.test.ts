import { describe, expect, it } from "vitest";
import {
  createMockIdentity,
  createTestConversationData,
  createTestMessageData,
  createTestUserData,
} from "@/lib/test/factories";
import { convexTest } from "../../__tests__/testSetup";
import { api } from "../_generated/api";
import schema from "../schema";

describe("cascade delete", () => {
  describe("conversation deletion", () => {
    it("deletes all related messages", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const convId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        const conversationId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        // Create 3 messages
        await ctx.db.insert(
          "messages",
          createTestMessageData(conversationId, userId, { content: "Msg 1" }),
        );
        await ctx.db.insert(
          "messages",
          createTestMessageData(conversationId, userId, { content: "Msg 2" }),
        );
        await ctx.db.insert(
          "messages",
          createTestMessageData(conversationId, userId, { content: "Msg 3" }),
        );
        return conversationId;
      });

      // Verify messages exist
      let messages = await t.run(async (ctx) => {
        return await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", convId))
          .collect();
      });
      expect(messages).toHaveLength(3);

      // Delete conversation
      const asUser = t.withIdentity(identity);
      // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
      await asUser.mutation(api.conversations.deleteConversation, {
        conversationId: convId,
      });

      // Verify messages deleted
      messages = await t.run(async (ctx) => {
        return await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", convId))
          .collect();
      });
      expect(messages).toHaveLength(0);
    });

    it("deletes related bookmarks", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const { convId, bookmarkId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        const conversationId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        const msgId = await ctx.db.insert(
          "messages",
          createTestMessageData(conversationId, userId),
        );

        // Create bookmark
        const bId = await ctx.db.insert("bookmarks", {
          userId,
          messageId: msgId,
          conversationId,
          createdAt: Date.now(),
        });

        return { convId: conversationId, bookmarkId: bId };
      });

      // Verify bookmark exists
      let bookmark = await t.run(async (ctx) => ctx.db.get(bookmarkId));
      expect(bookmark).toBeDefined();

      // Delete conversation
      const asUser = t.withIdentity(identity);
      await asUser.mutation(api.conversations.deleteConversation, {
        conversationId: convId,
      });

      // Verify bookmark deleted
      bookmark = await t.run(async (ctx) => ctx.db.get(bookmarkId));
      expect(bookmark).toBeNull();
    });

    it("nullifies memory conversationId instead of delete", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const { convId, memoryId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        const conversationId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );

        // Create memory linked to conversation
        const mId = await ctx.db.insert("memories", {
          userId,
          conversationId,
          content: "Test memory",
          embedding: new Array(1536).fill(0.1),
          metadata: {
            category: "fact",
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { convId: conversationId, memoryId: mId };
      });

      // Delete conversation
      const asUser = t.withIdentity(identity);
      await asUser.mutation(api.conversations.deleteConversation, {
        conversationId: convId,
      });

      // Memory should exist but with undefined conversationId
      const memory = await t.run(async (ctx) => ctx.db.get(memoryId));
      expect(memory).toBeDefined();
      expect(memory?.conversationId).toBeUndefined();
    });

    it("deletes related shares", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const { convId, shareId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        const conversationId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );

        // Create share
        const sId = await ctx.db.insert("shares", {
          conversationId,
          userId,
          shareId: "test-share-id",
          title: "Shared Conversation",
          isPublic: true,
          isActive: true,
          viewCount: 0,
          expiresAt: Date.now() + 86400000,
          createdAt: Date.now(),
        });

        return { convId: conversationId, shareId: sId };
      });

      // Verify share exists
      let share = await t.run(async (ctx) => ctx.db.get(shareId));
      expect(share).toBeDefined();

      // Delete conversation
      const asUser = t.withIdentity(identity);
      await asUser.mutation(api.conversations.deleteConversation, {
        conversationId: convId,
      });

      // Verify share deleted
      share = await t.run(async (ctx) => ctx.db.get(shareId));
      expect(share).toBeNull();
    });

    it("removes project junction records", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const { convId, junctionId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        const conversationId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );

        // Create project
        const projectId = await ctx.db.insert("projects", {
          userId,
          name: "Test Project",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Create junction
        const jId = await ctx.db.insert("projectConversations", {
          projectId,
          conversationId,
          addedAt: Date.now(),
          addedBy: userId,
        });

        return { convId: conversationId, junctionId: jId };
      });

      // Verify junction exists
      let junction = await t.run(async (ctx) => ctx.db.get(junctionId));
      expect(junction).toBeDefined();

      // Delete conversation
      const asUser = t.withIdentity(identity);
      await asUser.mutation(api.conversations.deleteConversation, {
        conversationId: convId,
      });

      // Verify junction deleted
      junction = await t.run(async (ctx) => ctx.db.get(junctionId));
      expect(junction).toBeNull();
    });

    it("deletes the conversation itself", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const convId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        return await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
      });

      // Verify conversation exists
      let conversation = await t.run(async (ctx) => ctx.db.get(convId));
      expect(conversation).toBeDefined();

      // Delete conversation
      const asUser = t.withIdentity(identity);
      await asUser.mutation(api.conversations.deleteConversation, {
        conversationId: convId,
      });

      // Verify conversation deleted
      conversation = await t.run(async (ctx) => ctx.db.get(convId));
      expect(conversation).toBeNull();
    });

    it("throws for non-owner", async () => {
      const t = convexTest(schema);

      const convId = await t.run(async (ctx) => {
        const ownerId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "owner" }),
        );
        await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "other", email: "other@example.com" }),
        );
        return await ctx.db.insert(
          "conversations",
          createTestConversationData(ownerId),
        );
      });

      const asOther = t.withIdentity(createMockIdentity({ subject: "other" }));

      await expect(
        asOther.mutation(api.conversations.deleteConversation, {
          conversationId: convId,
        }),
      ).rejects.toThrow("Not found");
    });

    it("deletes related conversationTokenUsage", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const { convId, tokenUsageId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        const conversationId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );

        const tId = await ctx.db.insert("conversationTokenUsage", {
          conversationId,
          model: "gpt-4o",
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
          messageCount: 5,
          lastUpdatedAt: Date.now(),
          createdAt: Date.now(),
        });

        return { convId: conversationId, tokenUsageId: tId };
      });

      let tokenUsage = await t.run(async (ctx) => ctx.db.get(tokenUsageId));
      expect(tokenUsage).toBeDefined();

      const asUser = t.withIdentity(identity);
      await asUser.mutation(api.conversations.deleteConversation, {
        conversationId: convId,
      });

      tokenUsage = await t.run(async (ctx) => ctx.db.get(tokenUsageId));
      expect(tokenUsage).toBeNull();
    });

    it("deletes related attachments", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const { convId, attachmentId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        const conversationId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        const msgId = await ctx.db.insert(
          "messages",
          createTestMessageData(conversationId, userId),
        );

        // Create a fake storage entry for the attachment
        const storageId = await ctx.storage.store(new Blob(["test"]));

        const aId = await ctx.db.insert("attachments", {
          messageId: msgId,
          conversationId,
          userId,
          type: "image",
          name: "test.png",
          storageId,
          mimeType: "image/png",
          size: 1024,
          createdAt: Date.now(),
        });

        return { convId: conversationId, attachmentId: aId };
      });

      let attachment = await t.run(async (ctx) => ctx.db.get(attachmentId));
      expect(attachment).toBeDefined();

      const asUser = t.withIdentity(identity);
      await asUser.mutation(api.conversations.deleteConversation, {
        conversationId: convId,
      });

      attachment = await t.run(async (ctx) => ctx.db.get(attachmentId));
      expect(attachment).toBeNull();
    });

    it("deletes related toolCalls", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const { convId, toolCallId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        const conversationId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        const msgId = await ctx.db.insert(
          "messages",
          createTestMessageData(conversationId, userId),
        );

        const tcId = await ctx.db.insert("toolCalls", {
          messageId: msgId,
          conversationId,
          userId,
          toolCallId: "tc-123",
          toolName: "web_search",
          args: { query: "test" },
          isPartial: false,
          timestamp: Date.now(),
          createdAt: Date.now(),
        });

        return { convId: conversationId, toolCallId: tcId };
      });

      let toolCall = await t.run(async (ctx) => ctx.db.get(toolCallId));
      expect(toolCall).toBeDefined();

      const asUser = t.withIdentity(identity);
      await asUser.mutation(api.conversations.deleteConversation, {
        conversationId: convId,
      });

      toolCall = await t.run(async (ctx) => ctx.db.get(toolCallId));
      expect(toolCall).toBeNull();
    });

    it("deletes related sources", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const { convId, sourceId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        const conversationId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        const msgId = await ctx.db.insert(
          "messages",
          createTestMessageData(conversationId, userId),
        );

        const sId = await ctx.db.insert("sources", {
          messageId: msgId,
          conversationId,
          userId,
          url: "https://example.com",
          urlHash: "abc123",
          title: "Example",
          position: 1,
          provider: "generic",
          isPartial: false,
          createdAt: Date.now(),
        });

        return { convId: conversationId, sourceId: sId };
      });

      let source = await t.run(async (ctx) => ctx.db.get(sourceId));
      expect(source).toBeDefined();

      const asUser = t.withIdentity(identity);
      await asUser.mutation(api.conversations.deleteConversation, {
        conversationId: convId,
      });

      source = await t.run(async (ctx) => ctx.db.get(sourceId));
      expect(source).toBeNull();
    });

    it("deletes related canvasDocuments and canvasHistory", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const { convId, docId, historyId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        const conversationId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );

        const dId = await ctx.db.insert("canvasDocuments", {
          conversationId,
          userId,
          title: "Test Canvas",
          content: "# Hello",
          documentType: "prose",
          version: 1,
          status: "active",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const hId = await ctx.db.insert("canvasHistory", {
          documentId: dId,
          userId,
          content: "# Hello",
          version: 1,
          source: "created",
          createdAt: Date.now(),
        });

        return { convId: conversationId, docId: dId, historyId: hId };
      });

      let doc = await t.run(async (ctx) => ctx.db.get(docId));
      let history = await t.run(async (ctx) => ctx.db.get(historyId));
      expect(doc).toBeDefined();
      expect(history).toBeDefined();

      const asUser = t.withIdentity(identity);
      await asUser.mutation(api.conversations.deleteConversation, {
        conversationId: convId,
      });

      doc = await t.run(async (ctx) => ctx.db.get(docId));
      history = await t.run(async (ctx) => ctx.db.get(historyId));
      expect(doc).toBeNull();
      expect(history).toBeNull();
    });
  });
});
