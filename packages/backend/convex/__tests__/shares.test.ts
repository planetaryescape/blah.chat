import { describe, expect, it } from "vitest";
import {
  createMockIdentity,
  createTestConversationData,
  createTestMessageData,
  createTestUserData,
} from "@/lib/test/factories";
import { convexTest } from "../../__tests__/testSetup";
import { api, internal } from "../_generated/api";
import schema from "../schema";

describe("convex/shares", () => {
  describe("get query", () => {
    it("returns share info without password hash", async () => {
      const t = convexTest(schema);

      const shareId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "owner" }),
        );
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        await ctx.db.insert("shares", {
          conversationId: convId,
          userId,
          shareId: "abc123",
          title: "Shared Conversation",
          isPublic: true,
          isActive: true,
          viewCount: 0,
          anonymizeUsernames: false,
          createdAt: Date.now(),
        });
        return "abc123";
      });

      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const result = await t.query(api.shares.get, { shareId });

      expect(result).not.toBeNull();
      expect(result?.requiresPassword).toBe(false);
      expect(result?.isActive).toBe(true);
    });

    it("returns null for non-existent share", async () => {
      const t = convexTest(schema);

      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const result = await t.query(api.shares.get, { shareId: "nonexistent" });

      expect(result).toBeNull();
    });

    it("returns revoked status for inactive share", async () => {
      const t = convexTest(schema);

      await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "owner" }),
        );
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        await ctx.db.insert("shares", {
          conversationId: convId,
          userId,
          shareId: "revoked123",
          title: "Revoked Share",
          isPublic: true,
          isActive: false,
          viewCount: 5,
          anonymizeUsernames: false,
          createdAt: Date.now(),
        });
      });

      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const result = await t.query(api.shares.get, { shareId: "revoked123" });

      expect(result).toEqual({ revoked: true });
    });

    it("returns null for expired share", async () => {
      const t = convexTest(schema);

      await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "owner" }),
        );
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        await ctx.db.insert("shares", {
          conversationId: convId,
          userId,
          shareId: "expired123",
          title: "Expired Share",
          isPublic: true,
          isActive: true,
          viewCount: 0,
          anonymizeUsernames: false,
          expiresAt: Date.now() - 1000, // Already expired
          createdAt: Date.now() - 100000,
        });
      });

      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const result = await t.query(api.shares.get, { shareId: "expired123" });

      expect(result).toEqual({ expired: true, expiresAt: expect.any(Number) });
    });

    it("indicates password requirement", async () => {
      const t = convexTest(schema);

      await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "owner" }),
        );
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        await ctx.db.insert("shares", {
          conversationId: convId,
          userId,
          shareId: "protected123",
          title: "Protected Share",
          password: "hashedpassword",
          isPublic: true,
          isActive: true,
          viewCount: 0,
          anonymizeUsernames: false,
          createdAt: Date.now(),
        });
      });

      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const result = await t.query(api.shares.get, { shareId: "protected123" });

      expect(result?.requiresPassword).toBe(true);
    });
  });

  describe("getSharedConversation query", () => {
    it("returns conversation for active share", async () => {
      const t = convexTest(schema);

      await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "owner" }),
        );
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId, { title: "My Chat" }),
        );
        await ctx.db.insert("shares", {
          conversationId: convId,
          userId,
          shareId: "conv123",
          title: "My Chat",
          isPublic: true,
          isActive: true,
          viewCount: 0,
          anonymizeUsernames: false,
          createdAt: Date.now(),
        });
      });

      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const result = await t.query(api.shares.getSharedConversation, {
        shareId: "conv123",
      });

      expect(result?.title).toBe("My Chat");
    });

    it("returns null for inactive share", async () => {
      const t = convexTest(schema);

      await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "owner" }),
        );
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        await ctx.db.insert("shares", {
          conversationId: convId,
          userId,
          shareId: "inactive123",
          title: "Inactive",
          isPublic: true,
          isActive: false,
          viewCount: 0,
          anonymizeUsernames: false,
          createdAt: Date.now(),
        });
      });

      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const result = await t.query(api.shares.getSharedConversation, {
        shareId: "inactive123",
      });

      expect(result).toEqual({ revoked: true });
    });
  });

  describe("getSharedMessages query", () => {
    it("returns messages for active share", async () => {
      const t = convexTest(schema);

      await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "owner" }),
        );
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, { content: "Hello" }),
        );
        await ctx.db.insert(
          "messages",
          createTestMessageData(convId, userId, {
            content: "World",
            role: "assistant",
            model: "gpt-4o",
          }),
        );
        await ctx.db.insert("shares", {
          conversationId: convId,
          userId,
          shareId: "msgs123",
          title: "Messages Share",
          isPublic: true,
          isActive: true,
          viewCount: 0,
          anonymizeUsernames: false,
          createdAt: Date.now(),
        });
      });

      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const result = await t.query(api.shares.getSharedMessages, {
        shareId: "msgs123",
      });

      expect(result).toHaveLength(2);
    });

    it("returns null for inactive share", async () => {
      const t = convexTest(schema);

      await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "owner" }),
        );
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        await ctx.db.insert("shares", {
          conversationId: convId,
          userId,
          shareId: "nomsg123",
          title: "No Messages",
          isPublic: true,
          isActive: false,
          viewCount: 0,
          anonymizeUsernames: false,
          createdAt: Date.now(),
        });
      });

      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const result = await t.query(api.shares.getSharedMessages, {
        shareId: "nomsg123",
      });

      expect(result).toEqual({ revoked: true });
    });
  });

  describe("getByConversation query", () => {
    it("returns share for conversation owner", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const convId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        const cId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        await ctx.db.insert("shares", {
          conversationId: cId,
          userId,
          shareId: "owner123",
          title: "Owner Share",
          isPublic: true,
          isActive: true,
          viewCount: 10,
          anonymizeUsernames: false,
          createdAt: Date.now(),
        });
        return cId;
      });

      const asUser = t.withIdentity(identity);
      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const result = await asUser.query(api.shares.getByConversation, {
        conversationId: convId,
      });

      expect(result?.shareId).toBe("owner123");
      expect(result?.viewCount).toBe(10);
    });

    it("returns null for non-owner", async () => {
      const t = convexTest(schema);
      const otherIdentity = createMockIdentity({ subject: "other" });

      const convId = await t.run(async (ctx) => {
        const ownerId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "owner" }),
        );
        await ctx.db.insert(
          "users",
          createTestUserData({
            clerkId: "other",
            email: "other@example.com",
          }),
        );
        const cId = await ctx.db.insert(
          "conversations",
          createTestConversationData(ownerId),
        );
        await ctx.db.insert("shares", {
          conversationId: cId,
          userId: ownerId,
          shareId: "notmine123",
          title: "Not Mine",
          isPublic: true,
          isActive: true,
          viewCount: 0,
          anonymizeUsernames: false,
          createdAt: Date.now(),
        });
        return cId;
      });

      const asOther = t.withIdentity(otherIdentity);
      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const result = await asOther.query(api.shares.getByConversation, {
        conversationId: convId,
      });

      expect(result).toBeNull();
    });
  });

  describe("list query", () => {
    it("returns shares for authenticated user", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        const convId1 = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        const convId2 = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId, { title: "Second" }),
        );
        await ctx.db.insert("shares", {
          conversationId: convId1,
          userId,
          shareId: "share1",
          title: "First",
          isPublic: true,
          isActive: true,
          viewCount: 0,
          anonymizeUsernames: false,
          createdAt: Date.now(),
        });
        await ctx.db.insert("shares", {
          conversationId: convId2,
          userId,
          shareId: "share2",
          title: "Second",
          isPublic: true,
          isActive: true,
          viewCount: 0,
          anonymizeUsernames: false,
          createdAt: Date.now(),
        });
      });

      const asUser = t.withIdentity(identity);
      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const result = await asUser.query(api.shares.list, {});

      expect(result).toHaveLength(2);
    });

    it("returns empty array for unauthenticated user", async () => {
      const t = convexTest(schema);

      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const result = await t.query(api.shares.list, {});

      expect(result).toEqual([]);
    });

    it("only returns shares for current user", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        const otherId = await ctx.db.insert(
          "users",
          createTestUserData({
            clerkId: "other",
            email: "other@example.com",
          }),
        );
        const myConvId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        const otherConvId = await ctx.db.insert(
          "conversations",
          createTestConversationData(otherId),
        );
        await ctx.db.insert("shares", {
          conversationId: myConvId,
          userId,
          shareId: "mine",
          title: "Mine",
          isPublic: true,
          isActive: true,
          viewCount: 0,
          anonymizeUsernames: false,
          createdAt: Date.now(),
        });
        await ctx.db.insert("shares", {
          conversationId: otherConvId,
          userId: otherId,
          shareId: "theirs",
          title: "Theirs",
          isPublic: true,
          isActive: true,
          viewCount: 0,
          anonymizeUsernames: false,
          createdAt: Date.now(),
        });
      });

      const asUser = t.withIdentity(identity);
      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const result = await asUser.query(api.shares.list, {});

      expect(result).toHaveLength(1);
      expect(result[0].shareId).toBe("mine");
    });
  });

  describe("toggle mutation", () => {
    it("toggles share active state", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const { convId, shareDocId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        const cId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        const sId = await ctx.db.insert("shares", {
          conversationId: cId,
          userId,
          shareId: "toggle123",
          title: "Toggle Test",
          isPublic: true,
          isActive: true,
          viewCount: 0,
          anonymizeUsernames: false,
          createdAt: Date.now(),
        });
        return { convId: cId, shareDocId: sId };
      });

      const asUser = t.withIdentity(identity);
      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      await asUser.mutation(api.shares.toggle, {
        conversationId: convId,
        isActive: false,
      });

      const share = await t.run(async (ctx) => {
        return await ctx.db.get(shareDocId);
      });

      expect(share?.isActive).toBe(false);
    });

    it("throws for non-owner", async () => {
      const t = convexTest(schema);
      const otherIdentity = createMockIdentity({ subject: "other" });

      const convId = await t.run(async (ctx) => {
        const ownerId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "owner" }),
        );
        await ctx.db.insert(
          "users",
          createTestUserData({
            clerkId: "other",
            email: "other@example.com",
          }),
        );
        const cId = await ctx.db.insert(
          "conversations",
          createTestConversationData(ownerId),
        );
        await ctx.db.insert("shares", {
          conversationId: cId,
          userId: ownerId,
          shareId: "notmine",
          title: "Not Mine",
          isPublic: true,
          isActive: true,
          viewCount: 0,
          anonymizeUsernames: false,
          createdAt: Date.now(),
        });
        return cId;
      });

      const asOther = t.withIdentity(otherIdentity);
      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      await expect(
        asOther.mutation(api.shares.toggle, {
          conversationId: convId,
          isActive: false,
        }),
      ).rejects.toThrow("Unauthorized");
    });
  });

  describe("remove mutation", () => {
    it("removes share for owner", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const shareDocId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(userId),
        );
        return await ctx.db.insert("shares", {
          conversationId: convId,
          userId,
          shareId: "remove123",
          title: "To Remove",
          isPublic: true,
          isActive: true,
          viewCount: 0,
          anonymizeUsernames: false,
          createdAt: Date.now(),
        });
      });

      const asUser = t.withIdentity(identity);
      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      await asUser.mutation(api.shares.remove, { shareId: shareDocId });

      const share = await t.run(async (ctx) => {
        return await ctx.db.get(shareDocId);
      });

      expect(share).toBeNull();
    });

    it("throws for non-owner", async () => {
      const t = convexTest(schema);
      const otherIdentity = createMockIdentity({ subject: "other" });

      const shareDocId = await t.run(async (ctx) => {
        const ownerId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "owner" }),
        );
        await ctx.db.insert(
          "users",
          createTestUserData({
            clerkId: "other",
            email: "other@example.com",
          }),
        );
        const convId = await ctx.db.insert(
          "conversations",
          createTestConversationData(ownerId),
        );
        return await ctx.db.insert("shares", {
          conversationId: convId,
          userId: ownerId,
          shareId: "cantremove",
          title: "Cant Remove",
          isPublic: true,
          isActive: true,
          viewCount: 0,
          anonymizeUsernames: false,
          createdAt: Date.now(),
        });
      });

      const asOther = t.withIdentity(otherIdentity);
      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      await expect(
        asOther.mutation(api.shares.remove, { shareId: shareDocId }),
      ).rejects.toThrow("Share not found or unauthorized");
    });
  });

  describe("createInternal mutation", () => {
    it("creates share with all fields", async () => {
      const t = convexTest(schema);

      const { convId, userId } = await t.run(async (ctx) => {
        const uId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: "test" }),
        );
        const cId = await ctx.db.insert(
          "conversations",
          createTestConversationData(uId, { title: "Test Conv" }),
        );
        return { convId: cId, userId: uId };
      });

      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      await t.mutation(internal.shares.createInternal, {
        conversationId: convId,
        userId,
        shareId: "internal123",
        title: "Test Conv",
        password: "hashedpw",
        expiresAt: Date.now() + 86400000,
        anonymizeUsernames: true,
      });

      const share = await t.run(async (ctx) => {
        return await ctx.db
          .query("shares")
          .withIndex("by_share_id", (q) => q.eq("shareId", "internal123"))
          .first();
      });

      expect(share?.title).toBe("Test Conv");
      expect(share?.password).toBe("hashedpw");
      expect(share?.anonymizeUsernames).toBe(true);
      expect(share?.viewCount).toBe(0);
    });
  });
});
