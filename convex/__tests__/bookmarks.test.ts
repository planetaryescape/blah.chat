import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import {
  createMockIdentity,
  createTestConversationData,
  createTestMessageData,
  createTestUserData,
} from "@/lib/test/factories";

describe("convex/bookmarks", () => {
  describe("create mutation", () => {
    it("creates bookmark with correct fields", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const { messageId, conversationId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        const msgId = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId),
        );
        return { messageId: msgId, conversationId: convId };
      });

      const asUser = t.withIdentity(identity);
      // @ts-ignore - Type instantiation too deep
      const bookmarkId = await asUser.mutation(api.bookmarks.create, {
        messageId,
        conversationId,
        note: "Test note",
        tags: ["important", "code"],
      });

      expect(bookmarkId).toBeDefined();

      const bookmark = await t.run(async (ctx) => ctx.db.get(bookmarkId));
      expect(bookmark?.note).toBe("Test note");
      expect(bookmark?.tags).toEqual(["important", "code"]);
    });

    it("throws for duplicate bookmark", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const { messageId, conversationId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        const msgId = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId),
        );

        // Pre-create bookmark
        await ctx.db.insert("bookmarks", {
          userId,
          messageId: msgId,
          conversationId: convId,
          tags: [],
          createdAt: Date.now(),
        });

        return { messageId: msgId, conversationId: convId };
      });

      const asUser = t.withIdentity(identity);
      // @ts-ignore - Type instantiation too deep
      await expect(
        asUser.mutation(api.bookmarks.create, { messageId, conversationId }),
      ).rejects.toThrow("Message already bookmarked");
    });
  });

  describe("remove mutation", () => {
    it("deletes bookmark", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const bookmarkId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        const msgId = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId),
        );
        return await ctx.db.insert("bookmarks", {
          userId,
          messageId: msgId,
          conversationId: convId,
          tags: [],
          createdAt: Date.now(),
        });
      });

      const asUser = t.withIdentity(identity);
      // @ts-ignore - Type instantiation too deep
      await asUser.mutation(api.bookmarks.remove, { bookmarkId });

      const deleted = await t.run(async (ctx) => ctx.db.get(bookmarkId));
      expect(deleted).toBeNull();
    });
  });

  describe("update mutation", () => {
    it("updates note and tags", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const bookmarkId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        const msgId = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId),
        );
        return await ctx.db.insert("bookmarks", {
          userId,
          messageId: msgId,
          conversationId: convId,
          note: "Old note",
          tags: ["old"],
          createdAt: Date.now(),
        });
      });

      const asUser = t.withIdentity(identity);
      // @ts-ignore - Type instantiation too deep
      await asUser.mutation(api.bookmarks.update, {
        bookmarkId,
        note: "New note",
        tags: ["new", "updated"],
      });

      const updated = await t.run(async (ctx) => ctx.db.get(bookmarkId));
      expect(updated?.note).toBe("New note");
      expect(updated?.tags).toEqual(["new", "updated"]);
    });
  });

  describe("list query", () => {
    it("returns only user's bookmarks", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity({ subject: "user-1" });

      await t.run(async (ctx) => {
        const user1Id = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "user-1" }),
        );
        const user2Id = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "user-2", email: "user2@test.com" }),
        );

        const conv1 = await ctx.db.insert(
          "conversations",
          createTestConversationData(user1Id),
        );
        const conv2 = await ctx.db.insert(
          "conversations",
          createTestConversationData(user2Id),
        );

        const msg1 = await ctx.db.insert(
          "messages",
          createTestMessageData(conv1, user1Id),
        );
        const msg2 = await ctx.db.insert(
          "messages",
          createTestMessageData(conv2, user2Id),
        );

        await ctx.db.insert("bookmarks", {
          userId: user1Id,
          messageId: msg1,
          conversationId: conv1,
          note: "My bookmark",
          tags: [],
          createdAt: Date.now(),
        });
        await ctx.db.insert("bookmarks", {
          userId: user2Id,
          messageId: msg2,
          conversationId: conv2,
          note: "Other bookmark",
          tags: [],
          createdAt: Date.now(),
        });
      });

      const asUser = t.withIdentity(identity);
      // @ts-ignore - Type instantiation too deep
      const result = await asUser.query(api.bookmarks.list, {});

      expect(result).toHaveLength(1);
      expect(result[0].note).toBe("My bookmark");
    });
  });

  describe("getByMessage query", () => {
    it("returns bookmark for message", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const messageId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        const msgId = await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId),
        );

        await ctx.db.insert("bookmarks", {
          userId,
          messageId: msgId,
          conversationId: convId,
          note: "Found bookmark",
          tags: [],
          createdAt: Date.now(),
        });

        return msgId;
      });

      const asUser = t.withIdentity(identity);
      // @ts-ignore - Type instantiation too deep
      const result = await asUser.query(api.bookmarks.getByMessage, {
        messageId,
      });

      expect(result?.note).toBe("Found bookmark");
    });

    it("returns null for non-bookmarked message", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const messageId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        return await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId),
        );
      });

      const asUser = t.withIdentity(identity);
      // @ts-ignore - Type instantiation too deep
      const result = await asUser.query(api.bookmarks.getByMessage, {
        messageId,
      });

      expect(result).toBeNull();
    });
  });
});
